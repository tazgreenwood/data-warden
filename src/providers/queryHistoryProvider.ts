import * as vscode from 'vscode';
import { QueryHistoryService, QueryHistoryEntry } from '../services/queryHistoryService';

export class QueryHistoryProvider implements vscode.TreeDataProvider<QueryHistoryItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<QueryHistoryItem | undefined | null | void> =
        new vscode.EventEmitter<QueryHistoryItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<QueryHistoryItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    constructor(private queryHistoryService: QueryHistoryService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: QueryHistoryItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: QueryHistoryItem): Thenable<QueryHistoryItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        const history = this.queryHistoryService.getHistory();

        if (history.length === 0) {
            return Promise.resolve([]);
        }

        return Promise.resolve(
            history.map(entry => new QueryHistoryItem(entry))
        );
    }
}

export class QueryHistoryItem extends vscode.TreeItem {
    constructor(public readonly entry: QueryHistoryEntry) {
        // Get first line of SQL for label (max 50 chars)
        const firstLine = entry.sql.split('\n')[0].trim();
        const label = firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;

        super(label, vscode.TreeItemCollapsibleState.None);

        // Format timestamp
        const date = new Date(entry.timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let timeAgo: string;
        if (diffMins < 1) {
            timeAgo = 'just now';
        } else if (diffMins < 60) {
            timeAgo = `${diffMins}m ago`;
        } else if (diffHours < 24) {
            timeAgo = `${diffHours}h ago`;
        } else if (diffDays === 1) {
            timeAgo = 'yesterday';
        } else {
            timeAgo = `${diffDays}d ago`;
        }

        // Build description
        const parts: string[] = [timeAgo];
        if (entry.database) {
            parts.push(entry.database);
        }
        this.description = parts.join(' • ');

        // Build tooltip with full SQL and details
        const tooltipLines = [
            `**SQL:**`,
            '```sql',
            entry.sql,
            '```',
            '',
            `**Executed:** ${date.toLocaleString()}`,
            `**Execution Time:** ${entry.executionTime}ms`
        ];

        if (entry.rowsAffected !== undefined) {
            tooltipLines.push(`**Rows Affected:** ${entry.rowsAffected.toLocaleString()}`);
        }

        if (entry.database) {
            tooltipLines.push(`**Database:** ${entry.database}`);
        }

        this.tooltip = new vscode.MarkdownString(tooltipLines.join('\n'));

        // Icon
        this.iconPath = new vscode.ThemeIcon('history');

        // Command to open query in new file
        this.command = {
            command: 'dataWarden.openHistoryQuery',
            title: 'Open Query',
            arguments: [this.entry]
        };

        // Context value for context menu
        this.contextValue = 'queryHistoryItem';
    }
}
