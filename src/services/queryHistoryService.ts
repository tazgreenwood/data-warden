import * as vscode from 'vscode';

export interface QueryHistoryEntry {
    id: string;
    sql: string;
    timestamp: number;
    executionTime: number;
    connectionId: string;
    database?: string;
    rowsAffected?: number;
}

export class QueryHistoryService {
    private static readonly MAX_HISTORY = 20;
    private static readonly STORAGE_KEY = 'dataWarden.queryHistory';

    constructor(private readonly context: vscode.ExtensionContext) {}

    /**
     * Add a query to the history
     */
    public addQuery(entry: Omit<QueryHistoryEntry, 'id' | 'timestamp'>): void {
        const history = this.getHistory();

        const newEntry: QueryHistoryEntry = {
            ...entry,
            id: this.generateId(),
            timestamp: Date.now()
        };

        // Add to beginning of array
        history.unshift(newEntry);

        // Keep only last MAX_HISTORY entries
        if (history.length > QueryHistoryService.MAX_HISTORY) {
            history.splice(QueryHistoryService.MAX_HISTORY);
        }

        this.saveHistory(history);
    }

    /**
     * Get all query history entries
     */
    public getHistory(): QueryHistoryEntry[] {
        return this.context.workspaceState.get<QueryHistoryEntry[]>(
            QueryHistoryService.STORAGE_KEY,
            []
        );
    }

    /**
     * Get a single query by ID
     */
    public getQuery(id: string): QueryHistoryEntry | undefined {
        return this.getHistory().find(entry => entry.id === id);
    }

    /**
     * Clear all history
     */
    public clearHistory(): void {
        this.saveHistory([]);
    }

    /**
     * Search history by SQL content
     */
    public searchHistory(searchTerm: string): QueryHistoryEntry[] {
        const term = searchTerm.toLowerCase();
        return this.getHistory().filter(entry =>
            entry.sql.toLowerCase().includes(term)
        );
    }

    private saveHistory(history: QueryHistoryEntry[]): void {
        this.context.workspaceState.update(QueryHistoryService.STORAGE_KEY, history);
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}
