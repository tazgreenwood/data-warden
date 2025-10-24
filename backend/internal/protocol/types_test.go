package protocol

import (
	"encoding/json"
	"testing"
)

func TestRequestSerialization(t *testing.T) {
	req := Request{
		JSONRPC: "2.0",
		ID:      "test-123",
		Method:  "testConnection",
		Params:  json.RawMessage(`{"host":"localhost","port":3306}`),
	}

	// Serialize to JSON
	data, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Failed to marshal request: %v", err)
	}

	// Deserialize back
	var decoded Request
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal request: %v", err)
	}

	// Verify fields
	if decoded.JSONRPC != "2.0" {
		t.Errorf("Expected JSONRPC '2.0', got '%s'", decoded.JSONRPC)
	}
	if decoded.ID != "test-123" {
		t.Errorf("Expected ID 'test-123', got '%s'", decoded.ID)
	}
	if decoded.Method != "testConnection" {
		t.Errorf("Expected Method 'testConnection', got '%s'", decoded.Method)
	}
}

func TestResponseSerialization(t *testing.T) {
	resp := Response{
		JSONRPC: "2.0",
		ID:      "test-456",
		Result:  map[string]string{"status": "ok"},
	}

	// Serialize to JSON
	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("Failed to marshal response: %v", err)
	}

	// Deserialize back
	var decoded Response
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	// Verify fields
	if decoded.JSONRPC != "2.0" {
		t.Errorf("Expected JSONRPC '2.0', got '%s'", decoded.JSONRPC)
	}
	if decoded.ID != "test-456" {
		t.Errorf("Expected ID 'test-456', got '%s'", decoded.ID)
	}
}

func TestErrorResponse(t *testing.T) {
	errResp := Response{
		JSONRPC: "2.0",
		ID:      "test-789",
		Error: &Error{
			Code:    InvalidParams,
			Message: "Invalid parameters",
			Data:    "Missing required field 'host'",
		},
	}

	// Serialize to JSON
	data, err := json.Marshal(errResp)
	if err != nil {
		t.Fatalf("Failed to marshal error response: %v", err)
	}

	// Deserialize back
	var decoded Response
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal error response: %v", err)
	}

	// Verify error fields
	if decoded.Error == nil {
		t.Fatal("Expected error to be present")
	}
	if decoded.Error.Code != InvalidParams {
		t.Errorf("Expected error code %d, got %d", InvalidParams, decoded.Error.Code)
	}
	if decoded.Error.Message != "Invalid parameters" {
		t.Errorf("Expected error message 'Invalid parameters', got '%s'", decoded.Error.Message)
	}
}

func TestConnectionConfigValidation(t *testing.T) {
	tests := []struct {
		name   string
		config ConnectionConfig
		valid  bool
	}{
		{
			name: "Valid MySQL config",
			config: ConnectionConfig{
				ID:       "conn-1",
				Name:     "Test Connection",
				Type:     "mysql",
				Host:     "localhost",
				Port:     3306,
				Username: "root",
				Password: "password",
				Database: "test_db",
			},
			valid: true,
		},
		{
			name: "Valid config without database",
			config: ConnectionConfig{
				ID:       "conn-2",
				Name:     "Test Connection 2",
				Type:     "mysql",
				Host:     "192.168.1.100",
				Port:     3306,
				Username: "admin",
				Password: "secret",
			},
			valid: true,
		},
		{
			name: "Config with SSL",
			config: ConnectionConfig{
				ID:       "conn-3",
				Name:     "Secure Connection",
				Type:     "mysql",
				Host:     "db.example.com",
				Port:     3306,
				Username: "user",
				Password: "pass",
				SSL:      true,
			},
			valid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test serialization
			data, err := json.Marshal(tt.config)
			if err != nil {
				t.Fatalf("Failed to marshal config: %v", err)
			}

			// Test deserialization
			var decoded ConnectionConfig
			if err := json.Unmarshal(data, &decoded); err != nil {
				t.Fatalf("Failed to unmarshal config: %v", err)
			}

			// Verify key fields
			if decoded.ID != tt.config.ID {
				t.Errorf("Expected ID '%s', got '%s'", tt.config.ID, decoded.ID)
			}
			if decoded.Host != tt.config.Host {
				t.Errorf("Expected Host '%s', got '%s'", tt.config.Host, decoded.Host)
			}
			if decoded.Port != tt.config.Port {
				t.Errorf("Expected Port %d, got %d", tt.config.Port, decoded.Port)
			}
		})
	}
}

func TestQueryResult(t *testing.T) {
	result := QueryResult{
		Columns:       []string{"id", "name", "email"},
		Rows:          [][]interface{}{{1, "John", "john@example.com"}, {2, "Jane", "jane@example.com"}},
		RowsAffected:  2,
		ExecutionTime: 150,
	}

	// Serialize
	data, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("Failed to marshal query result: %v", err)
	}

	// Deserialize
	var decoded QueryResult
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal query result: %v", err)
	}

	// Verify
	if len(decoded.Columns) != 3 {
		t.Errorf("Expected 3 columns, got %d", len(decoded.Columns))
	}
	if len(decoded.Rows) != 2 {
		t.Errorf("Expected 2 rows, got %d", len(decoded.Rows))
	}
	if decoded.RowsAffected != 2 {
		t.Errorf("Expected RowsAffected 2, got %d", decoded.RowsAffected)
	}
	if decoded.ExecutionTime != 150 {
		t.Errorf("Expected ExecutionTime 150, got %d", decoded.ExecutionTime)
	}
}

func TestTableMetadata(t *testing.T) {
	table := Table{
		Name:        "users",
		RowCount:    1000,
		Engine:      "InnoDB",
		DataLength:  2097152,  // 2MB
		IndexLength: 1048576,  // 1MB
	}

	// Serialize
	data, err := json.Marshal(table)
	if err != nil {
		t.Fatalf("Failed to marshal table: %v", err)
	}

	// Deserialize
	var decoded Table
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal table: %v", err)
	}

	// Verify
	if decoded.Name != "users" {
		t.Errorf("Expected table name 'users', got '%s'", decoded.Name)
	}
	if decoded.RowCount != 1000 {
		t.Errorf("Expected RowCount 1000, got %d", decoded.RowCount)
	}
	if decoded.DataLength != 2097152 {
		t.Errorf("Expected DataLength 2097152, got %d", decoded.DataLength)
	}
	if decoded.IndexLength != 1048576 {
		t.Errorf("Expected IndexLength 1048576, got %d", decoded.IndexLength)
	}
}

func TestColumnMetadata(t *testing.T) {
	defaultValue := "CURRENT_TIMESTAMP"
	column := Column{
		Name:     "created_at",
		Type:     "timestamp",
		Nullable: false,
		Key:      "",
		Default:  &defaultValue,
		Extra:    "on update CURRENT_TIMESTAMP",
		Comment:  "Record creation timestamp",
	}

	// Serialize
	data, err := json.Marshal(column)
	if err != nil {
		t.Fatalf("Failed to marshal column: %v", err)
	}

	// Deserialize
	var decoded Column
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal column: %v", err)
	}

	// Verify
	if decoded.Name != "created_at" {
		t.Errorf("Expected column name 'created_at', got '%s'", decoded.Name)
	}
	if decoded.Type != "timestamp" {
		t.Errorf("Expected type 'timestamp', got '%s'", decoded.Type)
	}
	if decoded.Nullable {
		t.Error("Expected Nullable to be false")
	}
	if decoded.Default == nil || *decoded.Default != defaultValue {
		t.Errorf("Expected default value '%s', got %v", defaultValue, decoded.Default)
	}
}
