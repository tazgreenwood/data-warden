package server

import (
	"encoding/json"
	"testing"

	"github.com/tazgreenwood/data-warden/internal/protocol"
)

func TestServerInitialization(t *testing.T) {
	s := NewServer()
	if s == nil {
		t.Fatal("NewServer() returned nil")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.connections == nil {
		t.Error("connections map not initialized")
	}
}

func TestParseTestConnectionRequest(t *testing.T) {
	testCases := []struct {
		name        string
		params      string
		expectError bool
	}{
		{
			name: "Valid request",
			params: `{
				"id": "test-1",
				"type": "mysql",
				"host": "localhost",
				"port": 3306,
				"username": "root",
				"password": "password",
				"database": "test_db"
			}`,
			expectError: false,
		},
		{
			name:        "Invalid JSON",
			params:      `{invalid json`,
			expectError: true,
		},
		{
			name:        "Empty params",
			params:      `{}`,
			expectError: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var config protocol.ConnectionConfig
			err := json.Unmarshal([]byte(tc.params), &config)

			if tc.expectError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tc.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestParseListDatabasesRequest(t *testing.T) {
	testCases := []struct {
		name        string
		params      string
		expectError bool
	}{
		{
			name:        "Valid request",
			params:      `{"connectionId": "conn-123"}`,
			expectError: false,
		},
		{
			name:        "Missing connectionId",
			params:      `{}`,
			expectError: false, // Will have empty string
		},
		{
			name:        "Invalid JSON",
			params:      `{bad json}`,
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var params struct {
				ConnectionID string `json:"connectionId"`
			}
			err := json.Unmarshal([]byte(tc.params), &params)

			if tc.expectError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tc.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestParseExecuteQueryRequest(t *testing.T) {
	testCases := []struct {
		name           string
		params         string
		expectedSQL    string
		expectedLimit  int
		expectedOffset int
		expectError    bool
	}{
		{
			name: "Query with limit and offset",
			params: `{
				"connectionId": "conn-123",
				"sql": "SELECT * FROM users",
				"limit": 100,
				"offset": 50
			}`,
			expectedSQL:    "SELECT * FROM users",
			expectedLimit:  100,
			expectedOffset: 50,
			expectError:    false,
		},
		{
			name: "Query without limit",
			params: `{
				"connectionId": "conn-123",
				"sql": "SELECT * FROM products"
			}`,
			expectedSQL:    "SELECT * FROM products",
			expectedLimit:  0,
			expectedOffset: 0,
			expectError:    false,
		},
		{
			name:        "Invalid JSON",
			params:      `{not valid json}`,
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var params protocol.QueryRequest
			err := json.Unmarshal([]byte(tc.params), &params)

			if tc.expectError {
				if err == nil {
					t.Error("Expected error but got none")
				}
				return
			}

			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			if params.SQL != tc.expectedSQL {
				t.Errorf("Expected SQL '%s', got '%s'", tc.expectedSQL, params.SQL)
			}
			if params.Limit != tc.expectedLimit {
				t.Errorf("Expected Limit %d, got %d", tc.expectedLimit, params.Limit)
			}
			if params.Offset != tc.expectedOffset {
				t.Errorf("Expected Offset %d, got %d", tc.expectedOffset, params.Offset)
			}
		})
	}
}

func TestConnectionPoolManagement(t *testing.T) {
	s := NewServer()

	// Initially should be empty
	s.mu.RLock()
	initialCount := len(s.connections)
	s.mu.RUnlock()

	if initialCount != 0 {
		t.Errorf("Expected 0 connections, got %d", initialCount)
	}

	// Verify the server has a connections map
	s.mu.RLock()
	hasMap := s.connections != nil
	s.mu.RUnlock()

	if !hasMap {
		t.Error("connections map should not be nil")
	}
}

func TestErrorCodes(t *testing.T) {
	testCases := []struct {
		code     int
		expected int
	}{
		{protocol.ParseError, -32700},
		{protocol.InvalidRequest, -32600},
		{protocol.MethodNotFound, -32601},
		{protocol.InvalidParams, -32602},
		{protocol.InternalError, -32603},
	}

	for _, tc := range testCases {
		if tc.code != tc.expected {
			t.Errorf("Error code mismatch: expected %d, got %d", tc.expected, tc.code)
		}
	}
}

func TestJSONRPCResponseFormat(t *testing.T) {
	// Test success response
	successResp := protocol.Response{
		JSONRPC: "2.0",
		ID:      "test-123",
		Result:  map[string]string{"status": "ok"},
	}

	data, err := json.Marshal(successResp)
	if err != nil {
		t.Fatalf("Failed to marshal success response: %v", err)
	}

	var decoded map[string]interface{}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if decoded["jsonrpc"] != "2.0" {
		t.Error("Missing or incorrect jsonrpc field")
	}
	if decoded["id"] != "test-123" {
		t.Error("Missing or incorrect id field")
	}
	if decoded["result"] == nil {
		t.Error("Missing result field")
	}

	// Test error response
	errorResp := protocol.Response{
		JSONRPC: "2.0",
		ID:      "test-456",
		Error: &protocol.Error{
			Code:    protocol.MethodNotFound,
			Message: "Method not found",
		},
	}

	data, err = json.Marshal(errorResp)
	if err != nil {
		t.Fatalf("Failed to marshal error response: %v", err)
	}

	decoded = make(map[string]interface{})
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal error response: %v", err)
	}

	if decoded["error"] == nil {
		t.Error("Missing error field")
	}
}
