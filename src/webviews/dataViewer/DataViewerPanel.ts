import * as vscode from 'vscode';
import { BackendClient } from '../../services/backendClient';
import { ConnectionManager } from '../../services/connectionManager';
import { QueryResult } from '../../types';
import { getTableViewHtml } from '../shared/tableView';

export class DataViewerPanel {
    public static currentPanel: DataViewerPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly context: vscode.ExtensionContext,
        private readonly backendClient: BackendClient,
        private readonly connectionManager: ConnectionManager,
        private database: string,
        private table: string
    ) {
        this.panel = panel;

        // Set the webview's initial html content
        this.update();

        // Listen for when the panel is disposed
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            null,
            this.disposables
        );
    }

    public static createOrShow(
        context: vscode.ExtensionContext,
        backendClient: BackendClient,
        connectionManager: ConnectionManager,
        database: string,
        table: string
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (DataViewerPanel.currentPanel) {
            DataViewerPanel.currentPanel.database = database;
            DataViewerPanel.currentPanel.table = table;
            DataViewerPanel.currentPanel.panel.reveal(column);
            DataViewerPanel.currentPanel.update();
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'dataWardenViewer',
            `${table} - Data Viewer`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media')
                ]
            }
        );

        DataViewerPanel.currentPanel = new DataViewerPanel(
            panel,
            context,
            backendClient,
            connectionManager,
            database,
            table
        );
    }

    private async handleMessage(message: any) {
        switch (message.command) {
            case 'load':
                await this.loadData(message.limit, message.offset, message.orderBy, message.orderDirection);
                break;
            case 'export':
                await this.exportData(message.format);
                break;
            case 'copyCell':
                await vscode.env.clipboard.writeText(message.value);
                vscode.window.showInformationMessage('Copied to clipboard');
                break;
            case 'copyColumn':
                await this.copyColumn(message.columnIndex, message.withHeader);
                break;
            case 'openJson':
                await this.openJsonInEditor(message.value);
                break;
        }
    }

    private async openJsonInEditor(jsonContent: string) {
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

    private async loadData(
        limit: number = 1000,
        offset: number = 0,
        orderBy?: string,
        orderDirection: 'ASC' | 'DESC' = 'ASC'
    ) {
        try {
            const activeConnection = this.connectionManager.getActiveConnection();
            if (!activeConnection) {
                this.panel.webview.postMessage({
                    command: 'error',
                    message: 'No active connection'
                });
                return;
            }

            // Build query (backend will add LIMIT/OFFSET)
            let sql = `SELECT * FROM \`${this.database}\`.\`${this.table}\``;
            if (orderBy) {
                sql += ` ORDER BY \`${orderBy}\` ${orderDirection}`;
            }

            console.log('Executing query:', sql, { limit, offset, database: this.database, table: this.table });

            // Execute query - backend handles LIMIT/OFFSET
            const result = await this.backendClient.sendRequest('executeQuery', {
                connectionId: activeConnection.id,
                sql: sql,
                limit,
                offset
            }) as QueryResult;

            // Validate result
            if (!result || !result.columns || !result.rows) {
                throw new Error('Invalid query result format');
            }

            // Send data to webview
            this.panel.webview.postMessage({
                command: 'data',
                data: result,
                database: this.database,
                table: this.table,
                limit,
                offset
            });

        } catch (error) {
            console.error('Failed to load data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.panel.webview.postMessage({
                command: 'error',
                message: `Failed to load data: ${errorMessage}`
            });
            vscode.window.showErrorMessage(`Data Viewer: ${errorMessage}`);
        }
    }

    private async exportData(format: 'json' | 'csv') {
        try {
            const activeConnection = this.connectionManager.getActiveConnection();
            if (!activeConnection) {
                throw new Error('No active connection');
            }

            // First, get row count to warn user about large exports
            const countSql = `SELECT COUNT(*) as count FROM \`${this.database}\`.\`${this.table}\``;
            const countResult = await this.backendClient.sendRequest('executeQuery', {
                connectionId: activeConnection.id,
                sql: countSql
            }) as QueryResult;

            const rowCount = countResult.rows[0]?.[0] as number || 0;

            // Warn about large exports
            if (rowCount > 10000) {
                const proceed = await vscode.window.showWarningMessage(
                    `This table contains ${rowCount.toLocaleString()} rows. Exporting large datasets may take time and consume memory. Continue?`,
                    { modal: true },
                    'Yes, Export All',
                    'Export First 10,000'
                );

                if (!proceed) {
                    return; // User cancelled
                }

                // If user wants limited export, apply limit
                if (proceed === 'Export First 10,000') {
                    const sql = `SELECT * FROM \`${this.database}\`.\`${this.table}\``;
                    const result = await this.backendClient.sendRequest('executeQuery', {
                        connectionId: activeConnection.id,
                        sql: sql,
                        limit: 10000
                    }) as QueryResult;

                    await this.writeExportFile(result, format);
                    return;
                }
            }

            // Get all data (remove limit)
            const sql = `SELECT * FROM \`${this.database}\`.\`${this.table}\``;
            const result = await this.backendClient.sendRequest('executeQuery', {
                connectionId: activeConnection.id,
                sql: sql
            }) as QueryResult;

            await this.writeExportFile(result, format);

        } catch (error) {
            vscode.window.showErrorMessage(
                `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    private async writeExportFile(result: QueryResult, format: 'json' | 'csv') {
        let content: string;
        let extension: string;

        if (format === 'json') {
            // Convert to JSON
            const rows = result.rows.map(row => {
                const obj: any = {};
                result.columns.forEach((col, i) => {
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
            csv.push(result.columns.map(col => `"${col}"`).join(','));
            // Rows
            result.rows.forEach(row => {
                csv.push(row.map(cell => {
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
            defaultUri: vscode.Uri.file(`${this.table}.${extension}`),
            filters: {
                [format.toUpperCase()]: [extension]
            }
        });

        if (uri) {
            const buffer = content instanceof Buffer ? content : Buffer.from(content, 'utf8');
            await vscode.workspace.fs.writeFile(uri, buffer);
            vscode.window.showInformationMessage(`Exported ${result.rows.length} rows to ${uri.fsPath}`);
        }
    }

    private async copyColumn(columnIndex: number, withHeader: boolean = false) {
        try {
            const activeConnection = this.connectionManager.getActiveConnection();
            if (!activeConnection) {
                throw new Error('No active connection');
            }

            const sql = `SELECT * FROM \`${this.database}\`.\`${this.table}\``;
            const result = await this.backendClient.sendRequest('executeQuery', {
                connectionId: activeConnection.id,
                sql: sql
            }) as QueryResult;

            let output = '';

            if (withHeader && result.columns) {
                output = result.columns[columnIndex] + '\n';
            }

            const values = result.rows.map(row => String(row[columnIndex] ?? '')).join('\n');
            output += values;

            await vscode.env.clipboard.writeText(output);
            const message = withHeader
                ? `Copied column with header (${result.rows.length + 1} rows)`
                : `Copied ${result.rows.length} values`;
            vscode.window.showInformationMessage(message);

        } catch (error) {
            vscode.window.showErrorMessage(
                `Copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    private update() {
        this.panel.title = `${this.table} - Data Viewer`;
        this.panel.webview.html = getTableViewHtml({
            title: 'Data Viewer',
            showPagination: true,
            showSqlDisplay: false
        });

        // Load initial data
        this.loadData();
    }

    public dispose() {
        DataViewerPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}

