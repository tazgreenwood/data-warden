import * as vscode from 'vscode';
import { ConnectionManager } from '../services/connectionManager';
import { ConnectionConfig } from '../types';
import { DatabaseTreeProvider } from '../providers/databaseTreeProvider';

export async function addConnectionCommand(
    connectionManager: ConnectionManager,
    treeProvider: DatabaseTreeProvider
): Promise<void> {
    try {
        // Step 1: Connection name
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for this connection',
            placeHolder: 'e.g., Production MySQL',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Connection name is required';
                }
                return null;
            }
        });

        if (!name) {
            return;
        }

        // Step 2: Host
        const host = await vscode.window.showInputBox({
            prompt: 'Enter the database host',
            placeHolder: 'e.g., localhost or db.example.com',
            value: 'localhost',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Host is required';
                }
                return null;
            }
        });

        if (!host) {
            return;
        }

        // Step 3: Port
        const portStr = await vscode.window.showInputBox({
            prompt: 'Enter the database port',
            placeHolder: '3306',
            value: '3306',
            validateInput: (value) => {
                const port = parseInt(value, 10);
                if (isNaN(port) || port < 1 || port > 65535) {
                    return 'Port must be a number between 1 and 65535';
                }
                return null;
            }
        });

        if (!portStr) {
            return;
        }
        const port = parseInt(portStr, 10);

        // Step 4: Username
        const username = await vscode.window.showInputBox({
            prompt: 'Enter the database username',
            placeHolder: 'e.g., root',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Username is required';
                }
                return null;
            }
        });

        if (!username) {
            return;
        }

        // Step 5: Password
        const password = await vscode.window.showInputBox({
            prompt: 'Enter the database password',
            password: true,
            placeHolder: 'Enter password (will be stored securely)'
        });

        if (password === undefined) {
            return;
        }

        // Step 6: Default database
        const database = await vscode.window.showInputBox({
            prompt: 'Enter the default database (optional)',
            placeHolder: 'e.g., myapp_db'
        });

        if (database === undefined) {
            return;
        }

        // Step 7: SSL
        const sslOptions = ['No', 'Yes'];
        const sslChoice = await vscode.window.showQuickPick(sslOptions, {
            placeHolder: 'Use SSL connection?'
        });

        if (!sslChoice) {
            return;
        }

        const ssl = sslChoice === 'Yes';

        // Build connection config
        const config: Omit<ConnectionConfig, 'id'> = {
            name: name.trim(),
            type: 'mysql',
            host: host.trim(),
            port,
            username: username.trim(),
            password,
            database: database?.trim() || '',
            ssl
        };

        // Test connection
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Testing connection...',
                cancellable: false
            },
            async () => {
                const testResult = await connectionManager.testConnection({
                    ...config,
                    id: 'test' // Temporary ID for testing
                });

                if (!testResult.success) {
                    throw new Error(testResult.message);
                }

                vscode.window.showInformationMessage(
                    `Connection successful! ${testResult.version ? `(${testResult.version})` : ''}`
                );
            }
        );

        // Save connection
        const id = await connectionManager.addConnection(config);

        vscode.window.showInformationMessage(`Connection "${name}" added successfully!`);

        // Ask if user wants to connect now
        const connectNow = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Connect to this database now?'
        });

        if (connectNow === 'Yes') {
            await connectionManager.setActiveConnection(id);
        }

        // Refresh tree view
        treeProvider.refresh();

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Provide helpful suggestions based on common errors
        let helpText = '';
        if (errorMessage.includes('connection refused') || errorMessage.includes('ECONNREFUSED')) {
            helpText = '\n\nTip: Make sure the database server is running and the host/port are correct.';
        } else if (errorMessage.includes('Access denied') || errorMessage.includes('authentication')) {
            helpText = '\n\nTip: Check your username and password.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
            helpText = '\n\nTip: Check your network connection and firewall settings.';
        } else if (errorMessage.includes('Unknown database')) {
            helpText = '\n\nTip: The database name might be incorrect or the database doesn\'t exist yet.';
        }

        vscode.window.showErrorMessage(
            `Failed to add connection: ${errorMessage}${helpText}`,
            'View Output'
        ).then(selection => {
            if (selection === 'View Output') {
                // Show the output panel - user can select Data Warden Backend channel
                vscode.commands.executeCommand('workbench.action.output.toggleOutput');
            }
        });
    }
}
