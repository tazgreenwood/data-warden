package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/tazgreenwood/data-warden/internal/connection"
	"github.com/tazgreenwood/data-warden/internal/protocol"
)

type cacheEntry struct {
	data      interface{}
	timestamp time.Time
	ttl       time.Duration
}

type queryContext struct {
	cancel context.CancelFunc
	sql    string
}

type Server struct {
	connections map[string]*connection.Connection
	mu          sync.RWMutex
	// Simple cache for metadata queries with 30-second TTL
	cache   map[string]cacheEntry
	cacheMu sync.RWMutex
	// Track running queries for cancellation
	runningQueries   map[string]queryContext
	runningQueriesMu sync.RWMutex
}

func NewServer() *Server {
	return &Server{
		connections:    make(map[string]*connection.Connection),
		cache:          make(map[string]cacheEntry),
		runningQueries: make(map[string]queryContext),
	}
}

func (s *Server) HandleRequest(req *protocol.Request) *protocol.Response {
	log.Printf("Handling request: %s", req.Method)

	response := &protocol.Response{
		JSONRPC: "2.0",
		ID:      req.ID,
	}

	switch req.Method {
	case "ping":
		response.Result = map[string]string{"status": "ok"}

	case "testConnection":
		result, err := s.handleTestConnection(req.Params)
		if err != nil {
			response.Error = &protocol.Error{
				Code:    protocol.InternalError,
				Message: err.Error(),
			}
		} else {
			response.Result = result
		}

	case "connect":
		err := s.handleConnect(req.Params)
		if err != nil {
			response.Error = &protocol.Error{
				Code:    protocol.InternalError,
				Message: err.Error(),
			}
		} else {
			response.Result = map[string]bool{"success": true}
		}

	case "disconnect":
		err := s.handleDisconnect(req.Params)
		if err != nil {
			response.Error = &protocol.Error{
				Code:    protocol.InternalError,
				Message: err.Error(),
			}
		} else {
			response.Result = map[string]bool{"success": true}
		}

	case "healthCheck":
		err := s.handleHealthCheck(req.Params)
		if err != nil {
			response.Error = &protocol.Error{
				Code:    protocol.InternalError,
				Message: err.Error(),
			}
		} else {
			response.Result = map[string]bool{"healthy": true}
		}

	case "listDatabases":
		result, err := s.handleListDatabases(req.Params)
		if err != nil {
			response.Error = &protocol.Error{
				Code:    protocol.InternalError,
				Message: err.Error(),
			}
		} else {
			response.Result = result
		}

	case "listTables":
		result, err := s.handleListTables(req.Params)
		if err != nil {
			response.Error = &protocol.Error{
				Code:    protocol.InternalError,
				Message: err.Error(),
			}
		} else {
			response.Result = result
		}

	case "listAllTables":
		result, err := s.handleListAllTables(req.Params)
		if err != nil {
			response.Error = &protocol.Error{
				Code:    protocol.InternalError,
				Message: err.Error(),
			}
		} else {
			response.Result = result
		}

	case "listColumns":
		result, err := s.handleListColumns(req.Params)
		if err != nil {
			response.Error = &protocol.Error{
				Code:    protocol.InternalError,
				Message: err.Error(),
			}
		} else {
			response.Result = result
		}

	case "executeQuery":
		result, err := s.handleExecuteQuery(req.ID, req.Params)
		if err != nil {
			response.Error = &protocol.Error{
				Code:    protocol.InternalError,
				Message: err.Error(),
			}
		} else {
			response.Result = result
		}

	case "cancelQuery":
		err := s.handleCancelQuery(req.Params)
		if err != nil {
			response.Error = &protocol.Error{
				Code:    protocol.InternalError,
				Message: err.Error(),
			}
		} else {
			response.Result = map[string]bool{"success": true}
		}

	default:
		response.Error = &protocol.Error{
			Code:    protocol.MethodNotFound,
			Message: fmt.Sprintf("Method not found: %s", req.Method),
		}
	}

	return response
}

func (s *Server) handleTestConnection(params json.RawMessage) (*protocol.ConnectionTestResult, error) {
	var config protocol.ConnectionConfig
	if err := json.Unmarshal(params, &config); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}

	conn, err := connection.NewConnection(&config)
	if err != nil {
		return &protocol.ConnectionTestResult{
			Success: false,
			Message: err.Error(),
		}, nil
	}
	defer conn.Close()

	version, err := conn.GetVersion()
	if err != nil {
		return &protocol.ConnectionTestResult{
			Success: false,
			Message: fmt.Sprintf("Connected but failed to get version: %v", err),
		}, nil
	}

	return &protocol.ConnectionTestResult{
		Success: true,
		Message: "Connection successful",
		Version: version,
	}, nil
}

func (s *Server) handleConnect(params json.RawMessage) error {
	var config protocol.ConnectionConfig
	if err := json.Unmarshal(params, &config); err != nil {
		return fmt.Errorf("invalid parameters: %w", err)
	}

	conn, err := connection.NewConnection(&config)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Close existing connection if any
	if existingConn, exists := s.connections[config.ID]; exists {
		existingConn.Close()
	}

	s.connections[config.ID] = conn
	log.Printf("Connection established: %s", config.ID)

	return nil
}

func (s *Server) handleDisconnect(params json.RawMessage) error {
	var req struct {
		ConnectionID string `json:"connectionId"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return fmt.Errorf("invalid parameters: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	conn, exists := s.connections[req.ConnectionID]
	if !exists {
		return fmt.Errorf("connection not found: %s", req.ConnectionID)
	}

	conn.Close()
	delete(s.connections, req.ConnectionID)
	log.Printf("Connection closed: %s", req.ConnectionID)

	return nil
}

func (s *Server) handleHealthCheck(params json.RawMessage) error {
	var req struct {
		ConnectionID string `json:"connectionId"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return fmt.Errorf("invalid parameters: %w", err)
	}

	conn := s.getConnection(req.ConnectionID)
	if conn == nil {
		return fmt.Errorf("connection not found: %s", req.ConnectionID)
	}

	return conn.HealthCheck()
}

func (s *Server) handleListDatabases(params json.RawMessage) ([]protocol.Database, error) {
	var req struct {
		ConnectionID string `json:"connectionId"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}

	// Check cache first
	cacheKey := fmt.Sprintf("listDatabases:%s", req.ConnectionID)
	if cached, ok := s.getFromCache(cacheKey); ok {
		if databases, ok := cached.([]protocol.Database); ok {
			log.Printf("Cache hit for listDatabases: %s", req.ConnectionID)
			return databases, nil
		}
	}

	conn := s.getConnection(req.ConnectionID)
	if conn == nil {
		return nil, fmt.Errorf("connection not found: %s", req.ConnectionID)
	}

	databases, err := conn.ListDatabases()
	if err != nil {
		return nil, err
	}

	// Cache the result
	s.setCache(cacheKey, databases)
	return databases, nil
}

func (s *Server) handleListTables(params json.RawMessage) ([]protocol.Table, error) {
	var req struct {
		ConnectionID string `json:"connectionId"`
		Database     string `json:"database"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}

	// Check cache first
	cacheKey := fmt.Sprintf("listTables:%s:%s", req.ConnectionID, req.Database)
	if cached, ok := s.getFromCache(cacheKey); ok {
		if tables, ok := cached.([]protocol.Table); ok {
			log.Printf("Cache hit for listTables: %s.%s", req.ConnectionID, req.Database)
			return tables, nil
		}
	}

	conn := s.getConnection(req.ConnectionID)
	if conn == nil {
		return nil, fmt.Errorf("connection not found: %s", req.ConnectionID)
	}

	tables, err := conn.ListTables(req.Database)
	if err != nil {
		return nil, err
	}

	// Cache the result
	s.setCache(cacheKey, tables)
	return tables, nil
}

func (s *Server) handleListAllTables(params json.RawMessage) (map[string][]protocol.Table, error) {
	var req struct {
		ConnectionID string `json:"connectionId"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}

	// Check cache first with longer TTL (5 minutes)
	cacheKey := fmt.Sprintf("listAllTables:%s", req.ConnectionID)
	if cached, ok := s.getFromCache(cacheKey); ok {
		if allTables, ok := cached.(map[string][]protocol.Table); ok {
			log.Printf("Cache hit for listAllTables: %s", req.ConnectionID)
			return allTables, nil
		}
	}

	conn := s.getConnection(req.ConnectionID)
	if conn == nil {
		return nil, fmt.Errorf("connection not found: %s", req.ConnectionID)
	}

	// Get all databases
	databases, err := conn.ListDatabases()
	if err != nil {
		return nil, fmt.Errorf("failed to list databases: %w", err)
	}

	// Filter out system databases
	systemDatabases := map[string]bool{
		"information_schema": true,
		"mysql":              true,
		"performance_schema": true,
		"sys":                true,
	}

	// Load tables from all user databases
	allTables := make(map[string][]protocol.Table)
	for _, db := range databases {
		if systemDatabases[db.Name] {
			continue
		}

		tables, err := conn.ListTables(db.Name)
		if err != nil {
			// Log error but continue with other databases
			log.Printf("Failed to load tables from %s: %v", db.Name, err)
			continue
		}

		allTables[db.Name] = tables
	}

	// Cache with longer TTL for all tables
	s.setCacheWithTTL(cacheKey, allTables, 5*time.Minute)
	return allTables, nil
}

func (s *Server) handleListColumns(params json.RawMessage) ([]protocol.Column, error) {
	var req struct {
		ConnectionID string `json:"connectionId"`
		Database     string `json:"database"`
		Table        string `json:"table"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}

	conn := s.getConnection(req.ConnectionID)
	if conn == nil {
		return nil, fmt.Errorf("connection not found: %s", req.ConnectionID)
	}

	return conn.ListColumns(req.Database, req.Table)
}

func (s *Server) handleExecuteQuery(requestID string, params json.RawMessage) (*protocol.QueryResult, error) {
	var req protocol.QueryRequest
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, fmt.Errorf("invalid parameters: %w", err)
	}

	conn := s.getConnection(req.ConnectionID)
	if conn == nil {
		return nil, fmt.Errorf("connection not found: %s", req.ConnectionID)
	}

	// Create a context that can be cancelled
	ctx, cancel := context.WithCancel(context.Background())

	// Register this query for potential cancellation
	s.runningQueriesMu.Lock()
	s.runningQueries[requestID] = queryContext{
		cancel: cancel,
		sql:    req.SQL,
	}
	s.runningQueriesMu.Unlock()

	// Ensure cleanup after query completes
	defer func() {
		s.runningQueriesMu.Lock()
		delete(s.runningQueries, requestID)
		s.runningQueriesMu.Unlock()
	}()

	log.Printf("Executing query (request %s): %s", requestID, req.SQL)
	return conn.ExecuteQueryWithContext(ctx, req.SQL, req.Limit, req.Offset)
}

func (s *Server) handleCancelQuery(params json.RawMessage) error {
	var req struct {
		RequestID string `json:"requestId"`
	}
	if err := json.Unmarshal(params, &req); err != nil {
		return fmt.Errorf("invalid parameters: %w", err)
	}

	s.runningQueriesMu.Lock()
	queryCtx, exists := s.runningQueries[req.RequestID]
	s.runningQueriesMu.Unlock()

	if !exists {
		return fmt.Errorf("query not found or already completed: %s", req.RequestID)
	}

	log.Printf("Cancelling query (request %s): %s", req.RequestID, queryCtx.sql)
	queryCtx.cancel()
	return nil
}

func (s *Server) getConnection(id string) *connection.Connection {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.connections[id]
}

func (s *Server) Shutdown() {
	s.mu.Lock()
	defer s.mu.Unlock()

	log.Println("Shutting down server, closing all connections...")
	for id, conn := range s.connections {
		conn.Close()
		log.Printf("Closed connection: %s", id)
	}
}

// getFromCache retrieves cached data if it exists and is not expired (30 second TTL)
func (s *Server) getFromCache(key string) (interface{}, bool) {
	s.cacheMu.RLock()
	defer s.cacheMu.RUnlock()

	entry, exists := s.cache[key]
	if !exists {
		return nil, false
	}

	// Check if cache entry is expired (use entry TTL or default 30 seconds)
	ttl := entry.ttl
	if ttl == 0 {
		ttl = 30 * time.Second
	}
	if time.Since(entry.timestamp) > ttl {
		return nil, false
	}

	return entry.data, true
}

// setCache stores data in cache with current timestamp and default TTL
func (s *Server) setCache(key string, data interface{}) {
	s.setCacheWithTTL(key, data, 0) // 0 means use default TTL
}

// setCacheWithTTL stores data in cache with current timestamp and custom TTL
func (s *Server) setCacheWithTTL(key string, data interface{}, ttl time.Duration) {
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()

	s.cache[key] = cacheEntry{
		data:      data,
		timestamp: time.Now(),
		ttl:       ttl,
	}
}

// invalidateCache removes cache entries matching a prefix
func (s *Server) invalidateCache(prefix string) {
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()

	for key := range s.cache {
		if len(key) >= len(prefix) && key[:len(prefix)] == prefix {
			delete(s.cache, key)
		}
	}
}
