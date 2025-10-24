import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class SavedQueriesProvider implements vscode.TreeDataProvider<QueryItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<QueryItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {
        // Watch for changes in queries folder
        const queriesPath = path.join(context.globalStorageUri.fsPath, 'queries');
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(queriesPath, '*.dwquery')
        );

        watcher.onDidCreate(() => this.refresh());
        watcher.onDidDelete(() => this.refresh());
        watcher.onDidChange(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: QueryItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: QueryItem): Promise<QueryItem[]> {
        if (element) {
            return [];
        }

        const queriesPath = path.join(this.context.globalStorageUri.fsPath, 'queries');

        // Ensure directory exists
        try {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(queriesPath));
        } catch {
            // Directory might already exist
        }

        // Read query files
        try {
            const files = fs.readdirSync(queriesPath);
            const queryFiles = files.filter(f => f.endsWith('.dwquery'));

            if (queryFiles.length === 0) {
                return [];
            }

            return queryFiles.map(file => {
                const filePath = path.join(queriesPath, file);
                const name = path.basename(file, '.dwquery');

                // Try to read metadata
                let description = '';
                let tags: string[] = [];

                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const lines = content.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('-- @description:')) {
                            description = line.replace('-- @description:', '').trim();
                        } else if (line.startsWith('-- @tags:')) {
                            const tagStr = line.replace('-- @tags:', '').trim();
                            tags = tagStr.split(',').map(t => t.trim()).filter(t => t);
                        }
                    }
                } catch (error) {
                    // Ignore read errors
                }

                return new QueryItem(
                    name,
                    vscode.Uri.file(filePath),
                    description,
                    tags
                );
            }).sort((a, b) => a.label.localeCompare(b.label));

        } catch (error) {
            console.error('Failed to read queries:', error);
            return [];
        }
    }
}

class QueryItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly uri: vscode.Uri,
        description: string,
        tags: string[]
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);

        this.description = description || undefined;
        this.tooltip = this.getTooltip(description, tags);
        this.iconPath = new vscode.ThemeIcon('file-code');

        // Make it clickable
        this.command = {
            command: 'vscode.open',
            title: 'Open Query',
            arguments: [uri]
        };

        this.contextValue = 'query';
    }

    private getTooltip(description: string, tags: string[]): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;

        tooltip.appendMarkdown(`### ${this.label}\n\n`);

        if (description) {
            tooltip.appendMarkdown(`${description}\n\n`);
        }

        if (tags.length > 0) {
            tooltip.appendMarkdown(`**Tags:** ${tags.join(', ')}\n\n`);
        }

        tooltip.appendMarkdown(`---\n\n*Click to open*`);

        return tooltip;
    }
}
