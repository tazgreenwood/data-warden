// JSON-RPC types
export interface JSONRPCRequest {
    jsonrpc: string;
    id: string;
    method: string;
    params?: any;
}

export interface JSONRPCResponse {
    jsonrpc: string;
    id: string;
    result?: any;
    error?: JSONRPCError;
}

export interface JSONRPCError {
    code: number;
    message: string;
    data?: any;
}

// Connection types
export interface ConnectionConfig {
    id: string;
    name: string;
    type: 'mysql';
    host: string;
    port: number;
    username: string;
    password?: string;
    database: string;
    ssl: boolean;
}

export interface ConnectionTestResult {
    success: boolean;
    message: string;
    version?: string;
}

export interface StoredConnection extends Omit<ConnectionConfig, 'password'> {
    // Password is stored separately in SecretStorage
}

// Schema types
export interface Database {
    name: string;
}

export interface Table {
    name: string;
    rowCount: number;
    engine?: string;
    dataLength: number;   // Size in bytes
    indexLength: number;  // Index size in bytes
}

export interface Column {
    name: string;
    type: string;
    nullable: boolean;
    key: string;
    default: string | null;
    extra: string;
    comment?: string;
}

// Query types
export interface QueryRequest {
    connectionId: string;
    sql: string;
    limit?: number;
    offset?: number;
}

export interface QueryResult {
    columns: string[];
    rows: any[][];
    rowsAffected: number;
    executionTime: number;
    totalRows?: number;
}

// Tree view types
export enum TreeItemType {
    Connection = 'connection',
    Database = 'database',
    Table = 'table',
    Column = 'column'
}

export interface TreeItemData {
    type: TreeItemType;
    connectionId?: string;
    database?: string;
    table?: string;
    column?: Column;
    isActive?: boolean;
}
