import * as vscode from 'vscode';
import { ConnectionManager } from '../services/connectionManager';
import { DatabaseTreeProvider } from '../providers/databaseTreeProvider';
import { ConnectionConfig, StoredConnection } from '../types';

export class ConnectionFormPanel {
    public static currentPanel: ConnectionFormPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private readonly connectionManager: ConnectionManager,
        private readonly treeProvider: DatabaseTreeProvider,
        private readonly existingConnection?: StoredConnection
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'test':
                        await this.testConnection(message.data);
                        return;
                    case 'save':
                        await this.saveConnection(message.data);
                        return;
                    case 'cancel':
                        this._panel.dispose();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public static async create(
        extensionUri: vscode.Uri,
        connectionManager: ConnectionManager,
        treeProvider: DatabaseTreeProvider,
        existingConnection?: StoredConnection
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Create and show a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'dataWardenConnectionForm',
            existingConnection ? `Edit Connection: ${existingConnection.name}` : 'New Database Connection',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true, // Keep form data when switching windows
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ]
            }
        );

        ConnectionFormPanel.currentPanel = new ConnectionFormPanel(
            panel,
            extensionUri,
            connectionManager,
            treeProvider,
            existingConnection
        );
    }

    private async testConnection(data: any) {
        try {
            this._panel.webview.postMessage({
                command: 'testStart'
            });

            const config: ConnectionConfig = {
                id: 'test',
                name: data.name,
                type: 'mysql',
                host: data.host,
                port: parseInt(data.port),
                username: data.username,
                password: data.password,
                database: data.database,
                ssl: data.ssl
            };

            const result = await this.connectionManager.testConnection(config);

            this._panel.webview.postMessage({
                command: 'testResult',
                success: result.success,
                message: result.success
                    ? `Connection successful! ${result.version ? `(${result.version})` : ''}`
                    : result.message
            });
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'testResult',
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private async saveConnection(data: any) {
        try {
            const config: Omit<ConnectionConfig, 'id'> = {
                name: data.name.trim(),
                type: 'mysql',
                host: data.host.trim(),
                port: parseInt(data.port),
                username: data.username.trim(),
                password: data.password,
                database: data.database?.trim() || '',
                ssl: data.ssl
            };

            let connectionId: string;

            if (this.existingConnection) {
                // Update existing connection
                await this.connectionManager.updateConnection(this.existingConnection.id, config);
                connectionId = this.existingConnection.id;
            } else {
                // Create new connection
                connectionId = await this.connectionManager.addConnection(config);
            }

            // Connect now if requested (only for new connections)
            if (!this.existingConnection && data.connectNow) {
                await this.connectionManager.setActiveConnection(connectionId);
            }

            // Refresh tree view (after connection is established)
            this.treeProvider.refresh();

            // Show success message
            const action = this.existingConnection ? 'updated' : 'added';
            vscode.window.showInformationMessage(`Connection "${data.name}" ${action} successfully!`);

            // Close the panel after a brief delay to ensure all operations complete
            setTimeout(() => {
                this._panel.dispose();
            }, 100);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Provide helpful suggestions based on common errors
            let helpText = '';
            if (errorMessage.includes('connection refused') || errorMessage.includes('ECONNREFUSED')) {
                helpText = 'Make sure the database server is running and the host/port are correct.';
            } else if (errorMessage.includes('Access denied') || errorMessage.includes('authentication')) {
                helpText = 'Check your username and password.';
            } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
                helpText = 'Check your network connection and firewall settings.';
            } else if (errorMessage.includes('Unknown database')) {
                helpText = 'The database name might be incorrect or doesn\'t exist yet.';
            }

            this._panel.webview.postMessage({
                command: 'saveError',
                message: errorMessage,
                helpText: helpText
            });
        }
    }

    public dispose() {
        ConnectionFormPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const existing = this.existingConnection;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Connection</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
        }

        h1 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 24px;
            color: var(--vscode-foreground);
        }

        .form-group {
            margin-bottom: 16px;
        }

        label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }

        input[type="text"],
        input[type="password"],
        input[type="number"] {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 2px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }

        input:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }

        .checkbox-group label {
            margin: 0;
            cursor: pointer;
        }

        .helper-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }

        .button-group {
            display: flex;
            gap: 8px;
            margin-top: 24px;
        }

        button {
            padding: 8px 16px;
            border: none;
            border-radius: 2px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            cursor: pointer;
            font-weight: 500;
        }

        .primary-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .primary-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .primary-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .secondary-button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .secondary-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .message {
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 16px;
            display: none;
        }

        .message.success {
            background-color: var(--vscode-testing-iconPassed);
            color: var(--vscode-editor-background);
        }

        .message.error {
            background-color: var(--vscode-errorForeground);
            color: var(--vscode-editor-background);
        }

        .message.info {
            background-color: var(--vscode-notificationsInfoIcon-foreground);
            color: var(--vscode-editor-background);
        }

        .spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid var(--vscode-button-foreground);
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${existing ? 'Edit Connection' : 'New Database Connection'}</h1>

        <div id="message" class="message"></div>

        <form id="connectionForm">
            <div class="form-group">
                <label for="name">Connection Name *</label>
                <input type="text" id="name" name="name" placeholder="e.g., Production MySQL" required value="${existing?.name || ''}">
                <div class="helper-text">A friendly name to identify this connection</div>
            </div>

            <div class="form-group">
                <label for="host">Host *</label>
                <input type="text" id="host" name="host" placeholder="e.g., localhost or db.example.com" required value="${existing?.host || 'localhost'}">
            </div>

            <div class="form-group">
                <label for="port">Port *</label>
                <input type="number" id="port" name="port" placeholder="3306" min="1" max="65535" required value="${existing?.port || 3306}">
            </div>

            <div class="form-group">
                <label for="username">Username *</label>
                <input type="text" id="username" name="username" placeholder="e.g., root" required value="${existing?.username || ''}">
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" placeholder="${existing ? 'Leave empty to keep existing password' : 'Enter password'}" ${existing ? '' : 'required'}>
                <div class="helper-text">Password is stored securely using VSCode's secret storage</div>
            </div>

            <div class="form-group">
                <label for="database">Default Database (Optional)</label>
                <input type="text" id="database" name="database" placeholder="e.g., myapp_db" value="${existing?.database || ''}">
                <div class="helper-text">The database to connect to by default</div>
            </div>

            <div class="form-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="ssl" name="ssl" ${existing?.ssl ? 'checked' : ''}>
                    <label for="ssl">Use SSL/TLS connection</label>
                </div>
            </div>

            ${!existing ? `
            <div class="form-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="connectNow" name="connectNow" checked>
                    <label for="connectNow">Connect after saving</label>
                </div>
            </div>
            ` : ''}

            <div class="button-group">
                <button type="button" id="testButton" class="secondary-button">Test Connection</button>
                <button type="submit" class="primary-button">Save Connection</button>
                <button type="button" id="cancelButton" class="secondary-button">Cancel</button>
            </div>
        </form>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const form = document.getElementById('connectionForm');
        const messageEl = document.getElementById('message');
        const testButton = document.getElementById('testButton');
        const cancelButton = document.getElementById('cancelButton');

        function showMessage(text, type) {
            messageEl.textContent = text;
            messageEl.className = 'message ' + type;
            messageEl.style.display = 'block';
        }

        function hideMessage() {
            messageEl.style.display = 'none';
        }

        function getFormData() {
            return {
                name: document.getElementById('name').value,
                host: document.getElementById('host').value,
                port: document.getElementById('port').value,
                username: document.getElementById('username').value,
                password: document.getElementById('password').value,
                database: document.getElementById('database').value,
                ssl: document.getElementById('ssl').checked,
                connectNow: document.getElementById('connectNow')?.checked || false
            };
        }

        testButton.addEventListener('click', () => {
            const data = getFormData();

            // Basic validation
            if (!data.name || !data.host || !data.port || !data.username) {
                showMessage('Please fill in all required fields', 'error');
                return;
            }

            testButton.disabled = true;
            testButton.innerHTML = '<span class="spinner"></span>Testing...';
            hideMessage();

            vscode.postMessage({
                command: 'test',
                data: data
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const data = getFormData();

            // Validate required fields
            if (!data.name || !data.host || !data.port || !data.username) {
                showMessage('Please fill in all required fields', 'error');
                return;
            }

            ${existing ? '' : `
            if (!data.password) {
                showMessage('Password is required', 'error');
                return;
            }
            `}

            hideMessage();

            vscode.postMessage({
                command: 'save',
                data: data
            });
        });

        cancelButton.addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
        });

        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'testStart':
                    testButton.disabled = true;
                    testButton.innerHTML = '<span class="spinner"></span>Testing...';
                    hideMessage();
                    break;

                case 'testResult':
                    testButton.disabled = false;
                    testButton.textContent = 'Test Connection';
                    showMessage(message.message, message.success ? 'success' : 'error');
                    break;

                case 'saveError':
                    let errorMsg = 'Failed to save connection: ' + message.message;
                    if (message.helpText) {
                        errorMsg += '\\n\\nTip: ' + message.helpText;
                    }
                    showMessage(errorMsg, 'error');
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
