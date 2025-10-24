import * as vscode from 'vscode';
import { BackendClient } from '../services/backendClient';
import { ConnectionManager } from '../services/connectionManager';
import { QueryHistoryService } from '../services/queryHistoryService';
import { getTableViewHtml } from '../webviews/shared/tableView';

let outputChannel: vscode.OutputChannel | undefined;
let resultsPanel: vscode.WebviewPanel | undefined;
let queryHistoryService: QueryHistoryService | undefined;

export async function executeQueryCommand(
    backendClient: BackendClient,
    connectionManager: ConnectionManager,
    context: vscode.ExtensionContext,
    historyService?: QueryHistoryService
): Promise<void> {
    // Store history service reference for use in showResults
    if (historyService) {
        queryHistoryService = historyService;
    }
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    // Check if it's a .dwquery file
    if (!editor.document.fileName.endsWith('.dwquery')) {
        vscode.window.showErrorMessage('This command only works with .dwquery files');
        return;
    }

    // Get active connection
    const activeConnection = connectionManager.getActiveConnection();
    if (!activeConnection) {
        vscode.window.showErrorMessage('No active database connection. Please connect first.');
        return;
    }

    // Get SQL to execute (selection or entire document)
    let sql: string;
    const selection = editor.selection;

    if (!selection.isEmpty) {
        sql = editor.document.getText(selection);
    } else {
        sql = editor.document.getText();
    }

    // Remove metadata comments and trim
    const lines = sql.split('\n');
    const sqlLines = lines.filter(line => !line.trim().startsWith('-- @'));
    sql = sqlLines.join('\n').trim();

    if (!sql) {
        vscode.window.showErrorMessage('No SQL to execute');
        return;
    }

    try {
        // Show progress with cancellable notification
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Executing query...',
                cancellable: true
            },
            async (progress, token) => {
                // Track elapsed time and cancellation state
                const startTime = Date.now();
                let cancelling = false;

                // Update progress with timer every second
                const timerInterval = setInterval(() => {
                    if (cancelling) {
                        const elapsed = Math.floor((Date.now() - startTime) / 1000);
                        progress.report({
                            message: `Cancelling... (${elapsed}s)`
                        });
                    } else {
                        const elapsed = Math.floor((Date.now() - startTime) / 1000);
                        progress.report({
                            message: `${elapsed}s elapsed`
                        });
                    }
                }, 1000);

                try {
                    // Execute query with cancellation support
                    const { requestId, promise } = await backendClient.sendCancellableRequest('executeQuery', {
                        connectionId: activeConnection.id,
                        sql: sql,
                        limit: 0,  // 0 means don't add automatic LIMIT
                        offset: 0
                    });

                    // Set up cancellation
                    const cancellationListener = token.onCancellationRequested(() => {
                        cancelling = true;
                        progress.report({
                            message: 'Cancelling query...'
                        });

                        // Fire the cancellation asynchronously
                        backendClient.cancelQuery(requestId).then(() => {
                            console.log('Cancellation request sent');
                        }).catch(err => {
                            console.error('Failed to cancel query:', err);
                            progress.report({
                                message: 'Failed to cancel - query still running'
                            });
                        });
                    });

                    try {
                        const result = await promise;
                        const executionTime = Date.now() - startTime;
                        clearInterval(timerInterval);
                        cancellationListener.dispose();

                        // Check if cancelled
                        if (token.isCancellationRequested) {
                            // Query was cancelled successfully
                            return; // Don't show results if cancelled
                        }

                        // Add to query history
                        if (queryHistoryService) {
                            queryHistoryService.addQuery({
                                sql: sql,
                                executionTime,
                                connectionId: activeConnection.id,
                                database: activeConnection.database,
                                rowsAffected: result.rowsAffected
                            });
                        }

                        // Show results in webview
                        showResults(context, result, sql);
                    } catch (err) {
                        cancellationListener.dispose();
                        throw err;
                    }
                } finally {
                    clearInterval(timerInterval);
                }
            }
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if it was cancelled
        if (errorMessage.includes('context canceled') || errorMessage.includes('cancelled') || errorMessage.includes('query cancelled')) {
            vscode.window.showInformationMessage('✓ Query cancelled successfully');
        } else {
            vscode.window.showErrorMessage(`Query execution failed: ${errorMessage}`);
        }
    }
}

function showResults(context: vscode.ExtensionContext, result: any, sql: string): void {
    // Create or show results panel in a new tab (full screen)
    if (resultsPanel) {
        resultsPanel.reveal(vscode.ViewColumn.Active);
        // Send data to existing panel
        resultsPanel.webview.postMessage({
            command: 'data',
            data: result,
            sql: sql
        });
    } else {
        resultsPanel = vscode.window.createWebviewPanel(
            'dataWardenResults',
            'Query Results',
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        resultsPanel.onDidDispose(() => {
            resultsPanel = undefined;
        });

        // Handle messages from webview
        resultsPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'copyCell':
                    await vscode.env.clipboard.writeText(message.value);
                    vscode.window.showInformationMessage('Copied to clipboard');
                    break;
                case 'export':
                    await exportResults(result, message.format);
                    break;
                case 'openJson':
                    await openJsonInEditor(message.value);
                    break;
            }
        });

        // Set initial HTML and then send data
        resultsPanel.webview.html = getTableViewHtml({
            title: 'Query Results',
            showPagination: false,
            showSqlDisplay: true
        });

        // Small delay to ensure webview is ready
        setTimeout(() => {
            resultsPanel?.webview.postMessage({
                command: 'data',
                data: result,
                sql: sql
            });
        }, 100);
    }
}

async function exportResults(result: any, format: 'json' | 'csv') {
    try {
        let content: string;
        let extension: string;

        if (format === 'json') {
            // Convert to JSON
            const rows = result.rows.map((row: any[]) => {
                const obj: any = {};
                result.columns.forEach((col: string, i: number) => {
                    obj[col] = row[i];
                });
                return obj;
            });
            content = JSON.stringify(rows, null, 2);
            extension = 'json';
        } else {
            // Convert to CSV
            const csv: string[] = [];
            // Header
            csv.push(result.columns.map((col: string) => `"${col}"`).join(','));
            // Rows
            result.rows.forEach((row: any[]) => {
                csv.push(row.map((cell: any) => {
                    if (cell === null) return '';
                    const str = String(cell);
                    // Escape quotes and wrap in quotes if contains comma
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                }).join(','));
            });
            content = csv.join('\n');
            extension = 'csv';
        }

        // Save file
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`query_results.${extension}`),
            filters: {
                [format.toUpperCase()]: [extension]
            }
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage(`Exported ${result.rows.length} rows to ${uri.fsPath}`);
        }

    } catch (error) {
        vscode.window.showErrorMessage(
            `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

async function openJsonInEditor(jsonContent: string) {
    try {
        // Create a new untitled document with JSON content
        const doc = await vscode.workspace.openTextDocument({
            content: jsonContent,
            language: 'json'
        });

        // Show the document in the editor
        await vscode.window.showTextDocument(doc, {
            preview: false,
            viewColumn: vscode.ViewColumn.Beside
        });
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to open JSON in editor: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}
