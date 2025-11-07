import * as vscode from 'vscode';
import { ConnectionManager } from '../services/connectionManager';
import { BackendClient } from '../services/backendClient';
import { TreeItemType, TreeItemData, Database, Table, Column } from '../types';
import { formatBytes, formatNumber } from '../utils/formatters';

export class DatabaseTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly data: TreeItemData,
        public readonly tableInfo?: Table  // Optional table metadata for enhanced display
    ) {
        super(label, collapsibleState);

        this.contextValue = data.type;
        this.tooltip = this.getTooltip();
        this.iconPath = this.getIcon();

        // Add description for tables
        if (data.type === TreeItemType.Table && tableInfo) {
            this.description = this.getTableDescription(tableInfo);
        }

        // Add commands for clickable items
        if (data.type === TreeItemType.Table) {
            this.command = {
                command: 'dataWarden.viewTableData',
                title: 'View Table Data',
                arguments: [this]
            };
        }
    }

    private getTableDescription(table: Table): string {
        const parts: string[] = [];

        if (table.rowCount > 0) {
            parts.push(`~${formatNumber(table.rowCount)} rows`);
        }

        const totalSize = table.dataLength + table.indexLength;
        if (totalSize > 0) {
            parts.push(formatBytes(totalSize));
        }

        return parts.join(' • ');
    }

    private getTooltip(): string | vscode.MarkdownString {
        switch (this.data.type) {
            case TreeItemType.Connection:
                return `${this.label}${this.data.isActive ? ' (Active)' : ''}`;
            case TreeItemType.Database:
                return `Database: ${this.label}`;
            case TreeItemType.Table:
                if (this.tableInfo) {
                    return this.getTableTooltip(this.tableInfo);
                }
                return `Table: ${this.label}`;
            case TreeItemType.Column:
                const col = this.data.column!;
                return `${col.name}: ${col.type}${col.nullable ? '' : ' NOT NULL'}${col.key ? ` ${col.key}` : ''}`;
            default:
                return this.label;
        }
    }

    private getTableTooltip(table: Table): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;

        tooltip.appendMarkdown(`### 📋 ${table.name}\n\n`);

        if (table.rowCount > 0) {
            tooltip.appendMarkdown(`**Rows:** ~${formatNumber(table.rowCount)} *(approximate)*\n\n`);
        }

        const totalSize = table.dataLength + table.indexLength;
        if (totalSize > 0) {
            tooltip.appendMarkdown(`**Total Size:** ${formatBytes(totalSize)}\n\n`);

            if (table.dataLength > 0) {
                tooltip.appendMarkdown(`- Data: ${formatBytes(table.dataLength)}\n`);
            }
            if (table.indexLength > 0) {
                tooltip.appendMarkdown(`- Indexes: ${formatBytes(table.indexLength)}\n`);
            }
            tooltip.appendMarkdown(`\n`);
        }

        if (table.engine) {
            tooltip.appendMarkdown(`**Engine:** ${table.engine}\n\n`);
        }

        if (table.rowCount > 0 && totalSize > 0) {
            const avgRowSize = totalSize / table.rowCount;
            tooltip.appendMarkdown(`**Avg Row Size:** ${formatBytes(avgRowSize)}\n\n`);
        }

        tooltip.appendMarkdown(`---\n\n*Click to view table data*`);

        return tooltip;
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.data.type) {
            case TreeItemType.Connection:
                return this.data.isActive
                    ? new vscode.ThemeIcon('plug', new vscode.ThemeColor('charts.green'))
                    : new vscode.ThemeIcon('plug');
            case TreeItemType.Database:
                return new vscode.ThemeIcon('database');
            case TreeItemType.Table:
                return new vscode.ThemeIcon('table');
            case TreeItemType.Column:
                const col = this.data.column!;
                if (col.key === 'PRI') {
                    return new vscode.ThemeIcon('key');
                } else if (col.key === 'UNI') {
                    return new vscode.ThemeIcon('symbol-key');
                }
                return new vscode.ThemeIcon('symbol-field');
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }
}

export class DatabaseTreeProvider implements vscode.TreeDataProvider<DatabaseTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<DatabaseTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(
        private connectionManager: ConnectionManager,
        private backendClient: BackendClient
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DatabaseTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DatabaseTreeItem): Promise<DatabaseTreeItem[]> {
        if (!element) {
            // Root level: show connections
            return this.getConnectionItems();
        }

        try {
            switch (element.data.type) {
                case TreeItemType.Connection:
                    return await this.getDatabaseItems(element.data.connectionId!);
                case TreeItemType.Database:
                    return await this.getTableItems(element.data.connectionId!, element.data.database!);
                case TreeItemType.Table:
                    return await this.getColumnItems(
                        element.data.connectionId!,
                        element.data.database!,
                        element.data.table!
                    );
                default:
                    return [];
            }
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            return [];
        }
    }

    private getConnectionItems(): DatabaseTreeItem[] {
        const connections = this.connectionManager.getAllConnections();
        const activeId = this.connectionManager.getActiveConnectionId();

        if (connections.length === 0) {
            return [];
        }

        return connections.map(conn => {
            const isActive = conn.id === activeId;
            const label = isActive ? `${conn.name} ✓` : conn.name;

            return new DatabaseTreeItem(
                label,
                vscode.TreeItemCollapsibleState.Collapsed,
                {
                    type: TreeItemType.Connection,
                    connectionId: conn.id,
                    connection: conn,
                    isActive
                }
            );
        });
    }

    private async getDatabaseItems(connectionId: string): Promise<DatabaseTreeItem[]> {
        const databases = await this.backendClient.sendRequest('listDatabases', {
            connectionId
        }) as Database[];

        const config = vscode.workspace.getConfiguration('dataWarden');
        const showSystemDatabases = config.get<boolean>('showSystemDatabases', false);

        const systemDatabases = ['information_schema', 'mysql', 'performance_schema', 'sys'];

        return databases
            .filter(db => showSystemDatabases || !systemDatabases.includes(db.name))
            .map(db => new DatabaseTreeItem(
                db.name,
                vscode.TreeItemCollapsibleState.Collapsed,
                {
                    type: TreeItemType.Database,
                    connectionId,
                    database: db.name
                }
            ));
    }

    private async getTableItems(connectionId: string, database: string): Promise<DatabaseTreeItem[]> {
        const tables = await this.backendClient.sendRequest('listTables', {
            connectionId,
            database
        }) as Table[];

        return tables.map(table => {
            // Just use table name as label - description and tooltip will show details
            return new DatabaseTreeItem(
                table.name,
                vscode.TreeItemCollapsibleState.Collapsed,
                {
                    type: TreeItemType.Table,
                    connectionId,
                    database,
                    table: table.name
                },
                table  // Pass table info for description and tooltip
            );
        });
    }

    private async getColumnItems(
        connectionId: string,
        database: string,
        table: string
    ): Promise<DatabaseTreeItem[]> {
        const columns = await this.backendClient.sendRequest('listColumns', {
            connectionId,
            database,
            table
        }) as Column[];

        return columns.map(column => {
            let label = `${column.name}: ${column.type}`;

            const badges: string[] = [];
            if (column.key === 'PRI') {
                badges.push('PK');
            }
            if (!column.nullable) {
                badges.push('NOT NULL');
            }
            if (column.extra) {
                badges.push(column.extra);
            }

            if (badges.length > 0) {
                label += ` [${badges.join(', ')}]`;
            }

            return new DatabaseTreeItem(
                label,
                vscode.TreeItemCollapsibleState.None,
                {
                    type: TreeItemType.Column,
                    connectionId,
                    database,
                    table,
                    column
                }
            );
        });
    }

    async connectConnection(item: DatabaseTreeItem): Promise<void> {
        try {
            await this.connectionManager.setActiveConnection(item.data.connectionId!);
            this.refresh();
            vscode.window.showInformationMessage(`Connected to ${item.label}`);
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async disconnectConnection(item: DatabaseTreeItem): Promise<void> {
        try {
            await this.connectionManager.disconnect(item.data.connectionId!);
            this.refresh();
            vscode.window.showInformationMessage(`Disconnected from ${item.label}`);
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async deleteConnection(item: DatabaseTreeItem): Promise<void> {
        const connection = this.connectionManager.getConnection(item.data.connectionId!);
        if (!connection) {
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete connection "${connection.name}"?`,
            { modal: true },
            'Delete'
        );

        if (confirm !== 'Delete') {
            return;
        }

        try {
            await this.connectionManager.deleteConnection(item.data.connectionId!);
            this.refresh();
            vscode.window.showInformationMessage(`Connection "${connection.name}" deleted`);
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to delete connection: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}
