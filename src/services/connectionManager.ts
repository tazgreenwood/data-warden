import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionConfig, StoredConnection, ConnectionTestResult } from '../types';
import { BackendClient } from './backendClient';

const CONNECTIONS_KEY = 'dataWarden.connections';
const ACTIVE_CONNECTION_KEY = 'dataWarden.activeConnection';

export class ConnectionManager {
    private connections: Map<string, StoredConnection> = new Map();
    private activeConnectionId: string | null = null;

    constructor(
        private context: vscode.ExtensionContext,
        private backendClient: BackendClient
    ) {
        this.loadConnections();
    }

    async addConnection(config: Omit<ConnectionConfig, 'id'>): Promise<string> {
        const id = uuidv4();
        const fullConfig: ConnectionConfig = { ...config, id };

        // Store password in SecretStorage
        if (config.password) {
            await this.context.secrets.store(
                `dataWarden.connection.${id}.password`,
                config.password
            );
        }

        // Store connection config (without password)
        const storedConnection: StoredConnection = {
            id,
            name: config.name,
            type: config.type,
            host: config.host,
            port: config.port,
            username: config.username,
            database: config.database,
            ssl: config.ssl
        };

        this.connections.set(id, storedConnection);
        await this.saveConnections();

        return id;
    }

    async updateConnection(id: string, config: Partial<ConnectionConfig>): Promise<void> {
        const existing = this.connections.get(id);
        if (!existing) {
            throw new Error(`Connection not found: ${id}`);
        }

        // Update password in SecretStorage if provided
        if (config.password !== undefined) {
            if (config.password) {
                await this.context.secrets.store(
                    `dataWarden.connection.${id}.password`,
                    config.password
                );
            } else {
                await this.context.secrets.delete(`dataWarden.connection.${id}.password`);
            }
        }

        // Update stored connection
        const updated: StoredConnection = {
            ...existing,
            ...config,
            id // Ensure ID doesn't change
        };

        this.connections.set(id, updated);
        await this.saveConnections();
    }

    async deleteConnection(id: string): Promise<void> {
        // Disconnect if active
        if (this.activeConnectionId === id) {
            await this.disconnect(id);
            this.activeConnectionId = null;
            await this.context.workspaceState.update(ACTIVE_CONNECTION_KEY, null);
        }

        // Delete password from SecretStorage
        await this.context.secrets.delete(`dataWarden.connection.${id}.password`);

        // Delete connection
        this.connections.delete(id);
        await this.saveConnections();
    }

    async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
        try {
            const result = await this.backendClient.sendRequest('testConnection', config);
            return result as ConnectionTestResult;
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async connect(id: string): Promise<void> {
        const config = await this.getConnectionConfig(id);
        if (!config) {
            throw new Error(`Connection not found: ${id}`);
        }

        await this.backendClient.sendRequest('connect', config);
        this.activeConnectionId = id;
        await this.context.workspaceState.update(ACTIVE_CONNECTION_KEY, id);

        // Preload all tables in the background to warm up the cache
        // This makes quick search (Cmd+Shift+T) instant when the user needs it
        this.backendClient.sendRequest('listAllTables', { connectionId: id })
            .catch(error => {
                console.error('Failed to preload tables cache:', error);
                // Silently fail - this is just cache warming
            });
    }

    async disconnect(id: string): Promise<void> {
        await this.backendClient.sendRequest('disconnect', { connectionId: id });

        if (this.activeConnectionId === id) {
            this.activeConnectionId = null;
            await this.context.workspaceState.update(ACTIVE_CONNECTION_KEY, null);
        }
    }

    async getConnectionConfig(id: string): Promise<ConnectionConfig | null> {
        const stored = this.connections.get(id);
        if (!stored) {
            return null;
        }

        // Retrieve password from SecretStorage
        const password = await this.context.secrets.get(`dataWarden.connection.${id}.password`);

        return {
            ...stored,
            password
        };
    }

    getConnection(id: string): StoredConnection | undefined {
        return this.connections.get(id);
    }

    getAllConnections(): StoredConnection[] {
        return Array.from(this.connections.values());
    }

    getActiveConnectionId(): string | null {
        return this.activeConnectionId;
    }

    getActiveConnection(): StoredConnection | null {
        if (!this.activeConnectionId) {
            return null;
        }
        return this.connections.get(this.activeConnectionId) || null;
    }

    async setActiveConnection(id: string): Promise<void> {
        if (!this.connections.has(id)) {
            throw new Error(`Connection not found: ${id}`);
        }

        // Disconnect old connection
        if (this.activeConnectionId && this.activeConnectionId !== id) {
            await this.disconnect(this.activeConnectionId);
        }

        // Connect to new connection
        await this.connect(id);
    }

    private loadConnections(): void {
        const stored = this.context.workspaceState.get<StoredConnection[]>(CONNECTIONS_KEY, []);
        this.connections = new Map(stored.map(conn => [conn.id, conn]));

        const activeId = this.context.workspaceState.get<string | null>(ACTIVE_CONNECTION_KEY, null);
        this.activeConnectionId = activeId;
    }

    private async saveConnections(): Promise<void> {
        const connectionsArray = Array.from(this.connections.values());
        await this.context.workspaceState.update(CONNECTIONS_KEY, connectionsArray);
    }

    async autoConnect(): Promise<void> {
        const config = vscode.workspace.getConfiguration('dataWarden');
        const autoConnect = config.get<boolean>('autoConnect', true);

        if (autoConnect && this.activeConnectionId) {
            try {
                await this.connect(this.activeConnectionId);
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to auto-connect: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        }
    }
}
