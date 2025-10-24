import * as vscode from 'vscode';
import { BackendClient } from '../../services/backendClient';
import { ConnectionManager } from '../../services/connectionManager';
import { QueryHistoryService } from '../../services/queryHistoryService';
import { QueryResult } from '../../types';

export class QueryEditorProvider implements vscode.CustomTextEditorProvider {
    private currentQueryRequestId: string | null = null;

    public static register(
        context: vscode.ExtensionContext,
        backendClient: BackendClient,
        connectionManager: ConnectionManager,
        queryHistoryService: QueryHistoryService
    ): vscode.Disposable {
        const provider = new QueryEditorProvider(context, backendClient, connectionManager, queryHistoryService);
        return vscode.window.registerCustomEditorProvider(
            'dataWarden.queryEditor',
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        );
    }

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly backendClient: BackendClient,
        private readonly connectionManager: ConnectionManager,
        private readonly queryHistoryService: QueryHistoryService
    ) {}

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);

        // Send initial content to webview
        this.updateWebview(webviewPanel.webview, document);

        // Handle messages from webview
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'execute':
                    await this.executeQuery(webviewPanel.webview, message.sql, message.selection);
                    break;
                case 'cancel':
                    await this.cancelQuery(webviewPanel.webview);
                    break;
                case 'updateContent':
                    await this.updateDocument(document, message.content);
                    break;
            }
        });

        // Update webview when document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                this.updateWebview(webviewPanel.webview, document);
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    }

    private updateWebview(webview: vscode.Webview, document: vscode.TextDocument) {
        webview.postMessage({
            command: 'update',
            content: document.getText()
        });
    }

    private async updateDocument(document: vscode.TextDocument, content: string) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            content
        );
        await vscode.workspace.applyEdit(edit);
    }

    private async executeQuery(webview: vscode.Webview, sql: string, selection?: { start: number; end: number }) {
        try {
            const activeConnection = this.connectionManager.getActiveConnection();
            if (!activeConnection) {
                webview.postMessage({
                    command: 'error',
                    message: 'No active connection. Please connect to a database first.'
                });
                return;
            }

            // Use selection if provided, otherwise use full SQL
            let queryToExecute = sql;
            if (selection && selection.start !== selection.end) {
                queryToExecute = sql.substring(selection.start, selection.end);
            }

            if (!queryToExecute.trim()) {
                webview.postMessage({
                    command: 'error',
                    message: 'No query to execute'
                });
                return;
            }

            webview.postMessage({
                command: 'executing',
                message: 'Executing query...'
            });

            const startTime = Date.now();

            // Send cancellable request
            const { requestId, promise } = await this.backendClient.sendCancellableRequest('executeQuery', {
                connectionId: activeConnection.id,
                sql: queryToExecute.trim()
            });

            // Track the current query for cancellation
            this.currentQueryRequestId = requestId;

            try {
                const result = await promise as QueryResult;
                const executionTime = Date.now() - startTime;

                // Add to query history
                this.queryHistoryService.addQuery({
                    sql: queryToExecute.trim(),
                    executionTime,
                    connectionId: activeConnection.id,
                    database: activeConnection.database,
                    rowsAffected: result.rowsAffected
                });

                webview.postMessage({
                    command: 'result',
                    result: {
                        ...result,
                        executionTime
                    }
                });
            } finally {
                this.currentQueryRequestId = null;
            }

        } catch (error) {
            this.currentQueryRequestId = null;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check if it was a cancellation
            if (errorMessage.includes('context canceled')) {
                webview.postMessage({
                    command: 'cancelled',
                    message: 'Query cancelled by user'
                });
            } else {
                webview.postMessage({
                    command: 'error',
                    message: errorMessage
                });
            }
        }
    }

    private async cancelQuery(webview: vscode.Webview) {
        if (!this.currentQueryRequestId) {
            vscode.window.showInformationMessage('No query is currently running');
            return;
        }

        try {
            await this.backendClient.cancelQuery(this.currentQueryRequestId);
            vscode.window.showInformationMessage('Query cancellation requested');
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to cancel query: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Query Editor</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }

        #toolbar {
            padding: 8px;
            background-color: var(--vscode-editorGroupHeader-tabsBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 10px;
            align-items: center;
            flex-shrink: 0;
        }

        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 14px;
            cursor: pointer;
            border-radius: 2px;
            font-size: 13px;
            font-weight: 500;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        button.primary {
            background-color: var(--vscode-button-background);
        }

        button.cancel {
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-errorForeground);
        }

        button.cancel:hover {
            opacity: 0.8;
        }

        #status {
            flex: 1;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        #container {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
            position: relative;
        }

        #editor {
            height: 50%;
            overflow: auto;
            border-bottom: 1px solid var(--vscode-panel-border);
            position: relative;
        }

        #editor textarea {
            width: 100%;
            height: 100%;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            border: none;
            outline: none;
            padding: 10px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.5;
            resize: none;
            tab-size: 4;
        }

        /* SQL Syntax Highlighting */
        #editor textarea {
            /* Make text invisible for overlay approach */
        }

        #resizer {
            height: 6px;
            background: var(--vscode-panel-border);
            cursor: ns-resize;
            position: relative;
            z-index: 10;
        }

        #resizer:hover {
            background: var(--vscode-focusBorder);
        }

        #results {
            flex: 1;
            overflow: auto;
            background-color: var(--vscode-editor-background);
        }

        .stats {
            padding: 10px;
            background-color: var(--vscode-editorWidget-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            font-size: 12px;
            display: flex;
            gap: 20px;
        }

        .stats .stat {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .stats .success {
            color: var(--vscode-testing-iconPassed);
        }

        .stats .error {
            color: var(--vscode-errorForeground);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        th {
            background-color: var(--vscode-editorGroupHeader-tabsBackground);
            color: var(--vscode-foreground);
            font-weight: 600;
            text-align: left;
            padding: 8px;
            border: 1px solid var(--vscode-panel-border);
            position: sticky;
            top: 0;
        }

        td {
            padding: 6px 8px;
            border: 1px solid var(--vscode-panel-border);
            cursor: pointer;
        }

        td:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        tr:nth-child(even) {
            background-color: var(--vscode-editor-background);
        }

        .null-value {
            color: var(--vscode-disabledForeground);
            font-style: italic;
        }

        .message {
            padding: 20px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
        }

        .error-message {
            padding: 15px;
            margin: 10px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
            border-radius: 3px;
        }

        .hint {
            padding: 20px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div id="toolbar">
        <button id="executeBtn" class="primary" title="Execute Query (Cmd/Ctrl+Enter)">▶ Execute</button>
        <button id="executeSelection" title="Execute Selected Text">▶ Execute Selection</button>
        <button id="cancelBtn" class="cancel" style="display: none;" title="Cancel Query">◼ Cancel</button>
        <div id="status">Ready</div>
    </div>
    <div id="container">
        <div id="editor">
            <textarea id="queryText" placeholder="-- Write your SQL query here&#10;-- Press Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) to execute&#10;&#10;SELECT * FROM users LIMIT 10;"></textarea>
        </div>
        <div id="resizer"></div>
        <div id="results">
            <div class="hint">
                💡 Write a SQL query above and press <strong>Execute</strong> or <strong>Cmd/Ctrl+Enter</strong>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const queryText = document.getElementById('queryText');
        const executeBtn = document.getElementById('executeBtn');
        const executeSelection = document.getElementById('executeSelection');
        const cancelBtn = document.getElementById('cancelBtn');
        const status = document.getElementById('status');
        const results = document.getElementById('results');
        const editor = document.getElementById('editor');
        const resizer = document.getElementById('resizer');
        const container = document.getElementById('container');

        let content = '';
        let isExecuting = false;

        // Resizer logic
        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = editor.offsetHeight;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const delta = e.clientY - startY;
            const newHeight = startHeight + delta;
            const minHeight = 100;
            const maxHeight = container.offsetHeight - 150;

            if (newHeight >= minHeight && newHeight <= maxHeight) {
                editor.style.height = newHeight + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
        });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'update':
                    content = message.content;
                    if (queryText.value !== content) {
                        queryText.value = content;
                    }
                    break;
                case 'result':
                    displayResults(message.result);
                    status.textContent = 'Query completed';
                    setExecutingState(false);
                    break;
                case 'error':
                    displayError(message.message);
                    status.textContent = 'Error';
                    setExecutingState(false);
                    break;
                case 'cancelled':
                    displayWarning(message.message);
                    status.textContent = 'Cancelled';
                    setExecutingState(false);
                    break;
                case 'executing':
                    status.textContent = message.message;
                    setExecutingState(true);
                    break;
            }
        });

        // Update content on change
        queryText.addEventListener('input', () => {
            content = queryText.value;
            vscode.postMessage({
                command: 'updateContent',
                content: content
            });
        });

        // Execute button
        executeBtn.addEventListener('click', () => {
            vscode.postMessage({
                command: 'execute',
                sql: queryText.value
            });
        });

        // Execute selection button
        executeSelection.addEventListener('click', () => {
            const selection = {
                start: queryText.selectionStart,
                end: queryText.selectionEnd
            };
            vscode.postMessage({
                command: 'execute',
                sql: queryText.value,
                selection: selection
            });
        });

        // Cancel button
        cancelBtn.addEventListener('click', () => {
            vscode.postMessage({
                command: 'cancel'
            });
        });

        // Keyboard shortcut: Cmd+Enter or Ctrl+Enter
        queryText.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                const selection = {
                    start: queryText.selectionStart,
                    end: queryText.selectionEnd
                };
                vscode.postMessage({
                    command: 'execute',
                    sql: queryText.value,
                    selection: selection.start !== selection.end ? selection : undefined
                });
            }
        });

        function displayResults(result) {
            if (!result.columns || result.columns.length === 0) {
                results.innerHTML = \`
                    <div class="stats">
                        <div class="stat success">✓ Success</div>
                        <div class="stat">⏱️ \${result.executionTime}ms</div>
                        <div class="stat">📊 \${result.rowsAffected} rows affected</div>
                    </div>
                    <div class="message">Query executed successfully. No results to display.</div>
                \`;
                return;
            }

            let html = \`
                <div class="stats">
                    <div class="stat success">✓ Success</div>
                    <div class="stat">⏱️ \${result.executionTime}ms</div>
                    <div class="stat">📊 \${result.rows.length} rows</div>
                </div>
                <table>
                    <thead><tr>
            \`;

            result.columns.forEach(col => {
                html += \`<th>\${escapeHtml(col)}</th>\`;
            });

            html += '</tr></thead><tbody>';

            result.rows.forEach(row => {
                html += '<tr>';
                row.forEach((cell, idx) => {
                    if (cell === null) {
                        html += '<td class="null-value" onclick="copyCell(this)">NULL</td>';
                    } else {
                        const escaped = escapeHtml(String(cell));
                        html += \`<td onclick="copyCell(this)">\${escaped}</td>\`;
                    }
                });
                html += '</tr>';
            });

            html += '</tbody></table>';
            results.innerHTML = html;
        }

        function displayError(message) {
            results.innerHTML = \`
                <div class="stats">
                    <div class="stat error">✗ Error</div>
                </div>
                <div class="error-message">\${escapeHtml(message)}</div>
            \`;
        }

        function displayWarning(message) {
            results.innerHTML = \`
                <div class="stats">
                    <div class="stat" style="color: var(--vscode-editorWarning-foreground);">⚠ Warning</div>
                </div>
                <div class="message">\${escapeHtml(message)}</div>
            \`;
        }

        function setExecutingState(executing) {
            console.log('setExecutingState:', executing);
            isExecuting = executing;
            if (executing) {
                executeBtn.disabled = true;
                executeSelection.disabled = true;
                cancelBtn.style.display = 'inline-block';
                console.log('Cancel button should be visible now');
            } else {
                executeBtn.disabled = false;
                executeSelection.disabled = false;
                cancelBtn.style.display = 'none';
                console.log('Cancel button hidden');
            }
        }

        function copyCell(td) {
            const text = td.textContent === 'NULL' ? '' : td.textContent;
            navigator.clipboard.writeText(text).then(() => {
                status.textContent = 'Copied to clipboard';
                setTimeout(() => {
                    status.textContent = 'Ready';
                }, 2000);
            });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>
</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
