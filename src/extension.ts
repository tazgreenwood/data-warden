import * as vscode from 'vscode';
import { BackendClient } from './services/backendClient';
import { ConnectionManager } from './services/connectionManager';
import { QueryHistoryService } from './services/queryHistoryService';
import { DatabaseTreeProvider } from './providers/databaseTreeProvider';
import { SavedQueriesProvider } from './providers/savedQueriesProvider';
import { QueryHistoryProvider } from './providers/queryHistoryProvider';
import { addConnectionCommand } from './commands/addConnection';
import { switchConnectionCommand } from './commands/switchConnection';
import { quickTableSearchCommand } from './commands/quickTableSearch';
import { newQueryCommand } from './commands/newQuery';
import { deleteQueryCommand } from './commands/deleteQuery';
import { duplicateQueryCommand } from './commands/duplicateQuery';
import { executeQueryCommand } from './commands/executeQuery';
import { queryTemplatesCommand } from './commands/queryTemplates';
import { formatSqlCommand } from './commands/formatSql';
import { DataViewerPanel } from './webviews/dataViewer/DataViewerPanel';

let backendClient: BackendClient;
let connectionManager: ConnectionManager;
let queryHistoryService: QueryHistoryService;
let databaseTreeProvider: DatabaseTreeProvider;
let savedQueriesProvider: SavedQueriesProvider;
let queryHistoryProvider: QueryHistoryProvider;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Data Warden extension is now active');

    try {
        // Initialize backend client
        backendClient = new BackendClient(context);
        await backendClient.start();

        // Initialize connection manager
        connectionManager = new ConnectionManager(context, backendClient);

        // Initialize query history service
        queryHistoryService = new QueryHistoryService(context);

        // Initialize tree view providers
        databaseTreeProvider = new DatabaseTreeProvider(connectionManager, backendClient);
        context.subscriptions.push(
            vscode.window.registerTreeDataProvider('dataWardenExplorer', databaseTreeProvider)
        );

        savedQueriesProvider = new SavedQueriesProvider(context);
        context.subscriptions.push(
            vscode.window.registerTreeDataProvider('dataWardenQueries', savedQueriesProvider)
        );

        queryHistoryProvider = new QueryHistoryProvider(queryHistoryService);
        context.subscriptions.push(
            vscode.window.registerTreeDataProvider('dataWardenHistory', queryHistoryProvider)
        );

        // Register commands
        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.addConnection', () =>
                addConnectionCommand(connectionManager, databaseTreeProvider)
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.switchConnection', () =>
                switchConnectionCommand(connectionManager, databaseTreeProvider)
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.refreshExplorer', () =>
                databaseTreeProvider.refresh()
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.quickTableSearch', async () => {
                await quickTableSearchCommand(
                    connectionManager,
                    backendClient,
                    async (database: string, table: string) => {
                        DataViewerPanel.createOrShow(
                            context,
                            backendClient,
                            connectionManager,
                            database,
                            table
                        );
                    }
                );
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.newQuery', async () => {
                await newQueryCommand(context);
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.openQuery', async () => {
                vscode.window.showInformationMessage('Open Query - Coming Soon!');
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.queryTemplates', async () => {
                await queryTemplatesCommand();
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.duplicateQuery', async () => {
                await duplicateQueryCommand();
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.formatSql', async () => {
                await formatSqlCommand();
            })
        );

        // Tree view item commands
        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.connectConnection', async (item) => {
                await databaseTreeProvider.connectConnection(item);
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.disconnectConnection', async (item) => {
                await databaseTreeProvider.disconnectConnection(item);
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.editConnection', async (item) => {
                vscode.window.showInformationMessage('Edit Connection - Coming Soon!');
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.deleteConnection', async (item) => {
                await databaseTreeProvider.deleteConnection(item);
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.viewTableData', async (item) => {
                if (item && item.data) {
                    DataViewerPanel.createOrShow(
                        context,
                        backendClient,
                        connectionManager,
                        item.data.database,
                        item.data.table
                    );
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.deleteQuery', async (item) => {
                await deleteQueryCommand(item, () => savedQueriesProvider.refresh());
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.executeQuery', async () => {
                await executeQueryCommand(backendClient, connectionManager, context, queryHistoryService);
                // Refresh history view after execution
                queryHistoryProvider.refresh();
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.openHistoryQuery', async (entry) => {
                // Create a new query file with the historical query
                const doc = await vscode.workspace.openTextDocument({
                    content: entry.sql,
                    language: 'sql'
                });
                await vscode.window.showTextDocument(doc);
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.clearHistory', async () => {
                const confirm = await vscode.window.showWarningMessage(
                    'Are you sure you want to clear all query history?',
                    { modal: true },
                    'Yes, Clear All'
                );
                if (confirm) {
                    queryHistoryService.clearHistory();
                    queryHistoryProvider.refresh();
                    vscode.window.showInformationMessage('Query history cleared');
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('dataWarden.refreshHistory', () => {
                queryHistoryProvider.refresh();
            })
        );

        // Auto-connect if configured
        await connectionManager.autoConnect();

        // Update status bar
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        statusBarItem.command = 'dataWarden.switchConnection';
        context.subscriptions.push(statusBarItem);

        updateStatusBar(statusBarItem, connectionManager);

        // Watch for connection changes
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('dataWarden')) {
                    updateStatusBar(statusBarItem, connectionManager);
                }
            })
        );

        vscode.window.showInformationMessage('Data Warden is ready!');

    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to activate Data Warden: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw error;
    }
}

export async function deactivate() {
    console.log('Data Warden extension is deactivating');

    if (backendClient) {
        await backendClient.stop();
    }
}

function updateStatusBar(statusBarItem: vscode.StatusBarItem, connectionManager: ConnectionManager) {
    const activeConnection = connectionManager.getActiveConnection();

    if (activeConnection) {
        statusBarItem.text = `$(database) ${activeConnection.name}`;
        statusBarItem.tooltip = `Active connection: ${activeConnection.name}\nClick to switch`;
        statusBarItem.show();
    } else {
        statusBarItem.text = `$(database) No connection`;
        statusBarItem.tooltip = 'Click to select a connection';
        statusBarItem.show();
    }
}
