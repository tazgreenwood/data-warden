package connection

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/tazgreenwood/data-warden/internal/protocol"
)

type Connection struct {
	config *protocol.ConnectionConfig
	db     *sql.DB
}

func NewConnection(config *protocol.ConnectionConfig) (*Connection, error) {
	if config.Type != "mysql" {
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	// Convert localhost to 127.0.0.1 to prefer IPv4
	// This avoids issues on macOS where localhost resolves to ::1 (IPv6) first
	host := config.Host
	if host == "localhost" {
		host = "127.0.0.1"
	}

	// Build DSN (Data Source Name)
	// Add timeout and cancellation support
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true&timeout=30s&readTimeout=30s&writeTimeout=30s",
		config.Username,
		config.Password,
		host,
		config.Port,
		config.Database,
	)

	if config.SSL {
		dsn += "&tls=true"
	}

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MySQL: %w. Check that host '%s' and port %d are correct", err, config.Host, config.Port)
	}

	// Configure connection pool for better performance
	// MaxOpenConns: Allow more concurrent queries
	db.SetMaxOpenConns(25)
	// MaxIdleConns: Keep more connections ready to reduce latency
	db.SetMaxIdleConns(10)
	// ConnMaxLifetime: Recycle connections to avoid stale connections
	db.SetConnMaxLifetime(time.Hour)
	// ConnMaxIdleTime: Close idle connections after 10 minutes
	db.SetConnMaxIdleTime(10 * time.Minute)

	// Test the connection
	if err := db.Ping(); err != nil {
		db.Close()
		// Provide helpful error messages based on common issues
		errMsg := err.Error()
		if strings.Contains(errMsg, "connection refused") {
			return nil, fmt.Errorf("connection refused: MySQL server is not running on %s:%d, or the port is blocked by a firewall", host, config.Port)
		} else if strings.Contains(errMsg, "Access denied") {
			return nil, fmt.Errorf("access denied: incorrect username '%s' or password. Check your credentials", config.Username)
		} else if strings.Contains(errMsg, "Unknown database") {
			return nil, fmt.Errorf("unknown database '%s': the database does not exist. Create it first or use a different database name", config.Database)
		} else if strings.Contains(errMsg, "timeout") {
			return nil, fmt.Errorf("connection timeout: could not reach %s:%d within 30 seconds. Check network connectivity", host, config.Port)
		}
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return &Connection{
		config: config,
		db:     db,
	}, nil
}

func (c *Connection) Close() error {
	if c.db != nil {
		return c.db.Close()
	}
	return nil
}

// looksLikeUUID checks if a 16-byte slice looks like it could be a UUID
func looksLikeUUID(b []byte) bool {
	if len(b) != 16 {
		return false
	}

	// Check if it's all zeros (empty/null)
	allZero := true
	for _, v := range b {
		if v != 0 {
			allZero = false
			break
		}
	}
	if allZero {
		return false
	}

	// Check if it looks like printable ASCII text (likely not a binary UUID)
	printableCount := 0
	for _, v := range b {
		if v >= 32 && v <= 126 {
			printableCount++
		}
	}

	// If more than 12 bytes are printable ASCII, it's probably text, not a UUID
	if printableCount > 12 {
		return false
	}

	// Likely a binary UUID
	return true
}

func (c *Connection) GetVersion() (string, error) {
	var version string
	err := c.db.QueryRow("SELECT VERSION()").Scan(&version)
	return version, err
}

// HealthCheck verifies the connection is still alive
func (c *Connection) HealthCheck() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := c.db.PingContext(ctx); err != nil {
		if strings.Contains(err.Error(), "connection refused") || strings.Contains(err.Error(), "broken pipe") {
			return fmt.Errorf("connection lost: database server is not reachable. Please reconnect")
		}
		return fmt.Errorf("health check failed: %w", err)
	}
	return nil
}

func (c *Connection) ListDatabases() ([]protocol.Database, error) {
	rows, err := c.db.Query("SHOW DATABASES")
	if err != nil {
		return nil, fmt.Errorf("failed to list databases: %w", err)
	}
	defer rows.Close()

	// Pre-allocate with reasonable capacity
	databases := make([]protocol.Database, 0, 16)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		databases = append(databases, protocol.Database{Name: name})
	}

	return databases, rows.Err()
}

func (c *Connection) ListTables(database string) ([]protocol.Table, error) {
	query := fmt.Sprintf("SHOW TABLE STATUS FROM `%s`", database)
	rows, err := c.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to list tables: %w", err)
	}
	defer rows.Close()

	// Pre-allocate with reasonable capacity for typical databases
	tables := make([]protocol.Table, 0, 64)
	for rows.Next() {
		var name string
		var engine sql.NullString
		var rowCount, dataLength, indexLength sql.NullInt64
		var ignore interface{}

		// SHOW TABLE STATUS returns many columns, we capture the important ones
		err := rows.Scan(
			&name,        // Name
			&engine,      // Engine
			&ignore,      // Version
			&ignore,      // Row_format
			&rowCount,    // Rows
			&ignore,      // Avg_row_length
			&dataLength,  // Data_length (bytes)
			&ignore,      // Max_data_length
			&indexLength, // Index_length (bytes)
			&ignore,      // Data_free
			&ignore,      // Auto_increment
			&ignore,      // Create_time
			&ignore,      // Update_time
			&ignore,      // Check_time
			&ignore,      // Collation
			&ignore,      // Checksum
			&ignore,      // Create_options
			&ignore,      // Comment
		)
		if err != nil {
			return nil, err
		}

		var count, dataSize, indexSize int64
		var engineStr string

		if rowCount.Valid {
			count = rowCount.Int64
		}
		if dataLength.Valid {
			dataSize = dataLength.Int64
		}
		if indexLength.Valid {
			indexSize = indexLength.Int64
		}
		if engine.Valid {
			engineStr = engine.String
		}

		tables = append(tables, protocol.Table{
			Name:        name,
			RowCount:    count,
			Engine:      engineStr,
			DataLength:  dataSize,
			IndexLength: indexSize,
		})
	}

	return tables, rows.Err()
}

func (c *Connection) ListColumns(database, table string) ([]protocol.Column, error) {
	query := fmt.Sprintf("SHOW FULL COLUMNS FROM `%s`.`%s`", database, table)
	rows, err := c.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to list columns: %w", err)
	}
	defer rows.Close()

	// Pre-allocate with reasonable capacity for typical tables
	columns := make([]protocol.Column, 0, 32)
	for rows.Next() {
		var col protocol.Column
		var nullStr string
		var defaultVal sql.NullString
		var collation, privileges sql.NullString

		err := rows.Scan(
			&col.Name,
			&col.Type,
			&collation,
			&nullStr,
			&col.Key,
			&defaultVal,
			&col.Extra,
			&privileges,
			&col.Comment,
		)
		if err != nil {
			return nil, err
		}

		col.Nullable = nullStr == "YES"
		if defaultVal.Valid {
			col.Default = &defaultVal.String
		}

		columns = append(columns, col)
	}

	return columns, rows.Err()
}

func (c *Connection) ExecuteQuery(sqlQuery string, limit, offset int) (*protocol.QueryResult, error) {
	return c.ExecuteQueryWithContext(context.Background(), sqlQuery, limit, offset)
}

func (c *Connection) ExecuteQueryWithContext(ctx context.Context, sqlQuery string, limit, offset int) (*protocol.QueryResult, error) {
	startTime := time.Now()

	// Check if context is already cancelled
	if ctx.Err() != nil {
		return nil, fmt.Errorf("query cancelled before execution: %w", ctx.Err())
	}

	// Apply limit and offset if provided
	if limit > 0 {
		sqlQuery = fmt.Sprintf("%s LIMIT %d", sqlQuery, limit)
		if offset > 0 {
			sqlQuery = fmt.Sprintf("%s OFFSET %d", sqlQuery, offset)
		}
	}

	rows, err := c.db.QueryContext(ctx, sqlQuery)
	if err != nil {
		// Check if it was a context cancellation
		if ctx.Err() != nil {
			return nil, fmt.Errorf("query cancelled: %w", ctx.Err())
		}
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close()

	// Get column names
	columnNames, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}

	// Prepare result with pre-allocated capacity for better performance
	// Use limit as capacity hint, or default to 100 if no limit
	capacity := 100
	if limit > 0 {
		capacity = limit
	}
	result := &protocol.QueryResult{
		Columns: columnNames,
		Rows:    make([][]interface{}, 0, capacity),
	}

	// Fetch rows
	for rows.Next() {
		// Check for cancellation between rows
		if ctx.Err() != nil {
			return nil, fmt.Errorf("query cancelled during fetch: %w", ctx.Err())
		}

		// Create a slice of interface{} to hold each column value
		columns := make([]interface{}, len(columnNames))
		columnPointers := make([]interface{}, len(columnNames))
		for i := range columns {
			columnPointers[i] = &columns[i]
		}

		if err := rows.Scan(columnPointers...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		// Convert byte slices - check if it's a binary16 UUID first
		for i, col := range columns {
			if b, ok := col.([]byte); ok {
				// Check if it's a 16-byte binary that looks like a UUID
				if len(b) == 16 && looksLikeUUID(b) {
					// Convert to hex string with UUID format
					hex := fmt.Sprintf("%x", b)
					uuid := fmt.Sprintf("%s-%s-%s-%s-%s",
						hex[0:8],
						hex[8:12],
						hex[12:16],
						hex[16:20],
						hex[20:32],
					)
					columns[i] = uuid
				} else {
					// Regular string conversion
					columns[i] = string(b)
				}
			}
		}

		result.Rows = append(result.Rows, columns)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	result.ExecutionTime = time.Since(startTime).Milliseconds()
	result.TotalRows = int64(len(result.Rows))
	result.RowsAffected = result.TotalRows

	return result, nil
}
