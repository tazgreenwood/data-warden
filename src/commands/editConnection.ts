import * as vscode from 'vscode';
import { ConnectionManager } from '../services/connectionManager';
import { DatabaseTreeProvider } from '../providers/databaseTreeProvider';
import { ConnectionFormPanel } from '../panels/ConnectionFormPanel';
import { StoredConnection } from '../types';

export async function editConnectionCommand(
    context: vscode.ExtensionContext,
    connectionManager: ConnectionManager,
    treeProvider: DatabaseTreeProvider,
    connection: StoredConnection
): Promise<void> {
    await ConnectionFormPanel.create(
        context.extensionUri,
        connectionManager,
        treeProvider,
        connection
    );
}
