package protocol

import "encoding/json"

// JSON-RPC 2.0 types
type Request struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      string          `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type Response struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      string      `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *Error      `json:"error,omitempty"`
}

type Error struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Error codes
const (
	ParseError     = -32700
	InvalidRequest = -32600
	MethodNotFound = -32601
	InvalidParams  = -32602
	InternalError  = -32603
)

// Connection types
type ConnectionConfig struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Database string `json:"database"`
	SSL      bool   `json:"ssl"`
}

type ConnectionTestResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Version string `json:"version,omitempty"`
}

// Schema types
type Database struct {
	Name string `json:"name"`
}

type Table struct {
	Name       string `json:"name"`
	RowCount   int64  `json:"rowCount"`
	Engine     string `json:"engine,omitempty"`
	DataLength int64  `json:"dataLength"`   // Size in bytes
	IndexLength int64 `json:"indexLength"`  // Index size in bytes
}

type Column struct {
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Nullable     bool    `json:"nullable"`
	Key          string  `json:"key"`
	Default      *string `json:"default"`
	Extra        string  `json:"extra"`
	Comment      string  `json:"comment,omitempty"`
}

// Query types
type QueryRequest struct {
	ConnectionID string `json:"connectionId"`
	SQL          string `json:"sql"`
	Limit        int    `json:"limit,omitempty"`
	Offset       int    `json:"offset,omitempty"`
}

type QueryResult struct {
	Columns      []string        `json:"columns"`
	Rows         [][]interface{} `json:"rows"`
	RowsAffected int64           `json:"rowsAffected"`
	ExecutionTime int64          `json:"executionTime"` // milliseconds
	TotalRows    int64           `json:"totalRows,omitempty"`
}
