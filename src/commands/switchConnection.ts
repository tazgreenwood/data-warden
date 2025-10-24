import * as vscode from 'vscode';
import { ConnectionManager } from '../services/connectionManager';
import { DatabaseTreeProvider } from '../providers/databaseTreeProvider';

export async function switchConnectionCommand(
    connectionManager: ConnectionManager,
    treeProvider: DatabaseTreeProvider
): Promise<void> {
    const connections = connectionManager.getAllConnections();

    if (connections.length === 0) {
        const addNew = await vscode.window.showInformationMessage(
            'No connections available. Would you like to add one?',
            'Add Connection'
        );

        if (addNew) {
            await vscode.commands.executeCommand('dataWarden.addConnection');
        }
        return;
    }

    const activeConnectionId = connectionManager.getActiveConnectionId();

    const items = connections.map(conn => ({
        label: conn.name,
        description: `${conn.username}@${conn.host}:${conn.port}`,
        detail: activeConnectionId === conn.id ? '✓ Currently active' : undefined,
        connectionId: conn.id
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a connection'
    });

    if (!selected) {
        return;
    }

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Connecting to ${selected.label}...`,
                cancellable: false
            },
            async () => {
                await connectionManager.setActiveConnection(selected.connectionId);
            }
        );

        vscode.window.showInformationMessage(`Connected to ${selected.label}`);
        treeProvider.refresh();

    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}
