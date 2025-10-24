import * as vscode from 'vscode';
import { ConnectionManager } from '../services/connectionManager';
import { BackendClient } from '../services/backendClient';
import { Table } from '../types';
import { formatNumber, formatBytes } from '../utils/formatters';

interface TableQuickPickItem extends vscode.QuickPickItem {
    database: string;
    table: Table;
}

export async function quickTableSearchCommand(
    connectionManager: ConnectionManager,
    backendClient: BackendClient,
    openDataViewer: (database: string, table: string) => Promise<void>
): Promise<void> {
    // Check if there's an active connection
    const activeConnection = connectionManager.getActiveConnection();
    if (!activeConnection) {
        const choice = await vscode.window.showInformationMessage(
            'No active connection. Please connect to a database first.',
            'Add Connection',
            'Switch Connection'
        );

        if (choice === 'Add Connection') {
            await vscode.commands.executeCommand('dataWarden.addConnection');
        } else if (choice === 'Switch Connection') {
            await vscode.commands.executeCommand('dataWarden.switchConnection');
        }
        return;
    }

    const connectionId = activeConnection.id;

    try {
        // Create quick pick with loading indicator
        const quickPick = vscode.window.createQuickPick<TableQuickPickItem>();
        quickPick.placeholder = 'Search for a table...';
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.busy = true;

        // Show immediately
        quickPick.show();

        // Load all tables from all databases
        const items = await loadAllTables(connectionId, backendClient);
        quickPick.items = items;
        quickPick.busy = false;

        // Handle selection
        quickPick.onDidAccept(async () => {
            const selected = quickPick.selectedItems[0];
            if (selected) {
                quickPick.hide();
                await openDataViewer(selected.database, selected.table.name);
            }
        });

        quickPick.onDidHide(() => {
            quickPick.dispose();
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        vscode.window.showErrorMessage(
            `Failed to load tables: ${errorMessage}`,
            'Retry',
            'View Output'
        ).then(selection => {
            if (selection === 'Retry') {
                quickTableSearchCommand(connectionManager, backendClient, openDataViewer);
            } else if (selection === 'View Output') {
                vscode.commands.executeCommand('workbench.action.output.toggleOutput');
            }
        });
    }
}

async function loadAllTables(
    connectionId: string,
    backendClient: BackendClient
): Promise<TableQuickPickItem[]> {
    // Use the new listAllTables method that loads everything in one request
    const allTables = await backendClient.sendRequest('listAllTables', {
        connectionId
    }) as Record<string, Table[]>;

    const items: TableQuickPickItem[] = [];

    // Process all databases and tables
    for (const [dbName, tables] of Object.entries(allTables)) {
        // Validate that tables is an array
        if (!Array.isArray(tables)) {
            console.error(`listAllTables returned non-array for ${dbName}:`, tables);
            continue;
        }

        for (const table of tables) {
            const totalSize = table.dataLength + table.indexLength;
            const details: string[] = [];

            if (table.rowCount > 0) {
                details.push(`${formatNumber(table.rowCount)} rows`);
            }

            if (totalSize > 0) {
                details.push(formatBytes(totalSize));
            }

            items.push({
                label: `$(table) ${table.name}`,
                description: dbName,
                detail: details.length > 0 ? details.join(' • ') : undefined,
                database: dbName,
                table: table
            });
        }
    }

    // Sort by table name
    items.sort((a, b) => a.table.name.localeCompare(b.table.name));

    return items;
}
