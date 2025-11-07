# Changelog

All notable changes to the Data Warden extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-01-07

### Added
- **Edit Connection**: Right-click any connection in the tree view to edit its settings
- **Improved Connection Form**: New persistent webview form for adding/editing connections
  - All fields visible at once (no more sequential input boxes)
  - Form stays open when switching windows (e.g., to grab passwords from password manager)
  - "Test Connection" button to verify settings before saving
  - Better error messages with context-specific troubleshooting tips
- **Data Migration**: Automatic migration from workspace-specific to global storage for existing users

### Fixed
- **Connection Persistence**: Connections and query history now persist across all VSCode windows
  - Changed from `workspaceState` to `globalState` storage
  - Connections are now truly global (like DBeaver, TablePlus, etc.)
  - Fixes issue where opening a new VSCode window would lose all connections
- **Tree View Refresh**: Tree view now correctly updates after connecting to a database
- **Startup Notification**: Removed "Data Warden is ready!" message that appeared on every VSCode startup

### Changed
- Connection creation flow now uses a persistent form panel instead of 7 sequential input boxes
- Tree view items now include connection object for easier command access

## [0.1.0] - 2025-10-23

### Added

#### Core Features
- **MySQL/MariaDB Support**: Full connection support with SSL options
- **Connection Management**:
  - Add, edit, delete, and switch between connections
  - Secure password storage using VSCode SecretStorage API
  - Test connections before saving
  - Auto-connect to last active connection on startup
  - Connection status indicator in status bar

#### Database Explorer
- **Tree View** with hierarchical navigation:
  - Connections (with active indicator)
  - Databases (with system database filtering)
  - Tables (with row counts and size information)
  - Columns (with types, constraints, and metadata)
- **Quick Table Search** (`Cmd+Shift+T`):
  - Instant search across all tables in all databases
  - Shows row counts and table sizes
  - Fuzzy matching on table names and descriptions
  - Cache preloaded on connection for instant results

#### Query Editor
- **Full-featured SQL Editor**:
  - SQL syntax highlighting and autocomplete
  - Execute queries with `Cmd+Enter` or button
  - Execute selected text support
  - Auto-save to `.dwquery` files
  - **Query Cancellation**: Stop long-running queries instantly with cancel button
  - Progress notifications with elapsed time
- **Query History**:
  - Automatically tracks last 20 executed queries
  - Sidebar view with time-ago display (e.g., "5m ago", "yesterday")
  - Shows execution time, row count, and database
  - Click to open historical query in new file
  - Clear history command
- **Query Templates**:
  - 16 built-in SQL templates (SELECT, JOIN, INSERT, UPDATE, DELETE, etc.)
  - Common table expressions (CTE), window functions, subqueries
  - ALTER TABLE, CREATE TABLE patterns
- **Query Utilities**:
  - Format SQL command (integrates with VSCode formatter extensions)
  - Duplicate query file command
- **Results Viewer**:
  - Sortable columns (click headers)
  - Paginated results for large datasets
  - Click cells to copy values
  - Export to JSON or CSV

#### Data Viewer
- **Interactive Table Browser**:
  - View table data with pagination
  - Sortable columns
  - Copy cells, rows, and columns
  - Export to JSON or CSV (CSV files can be imported to Excel)
  - Large export warnings (>10k rows)
- **Smart Data Type Handling**:
  - **Binary16 UUID Detection**: Automatic conversion and formatting of binary UUID columns
  - **JSON Viewer**:
    - Click JSON cells to open modal with syntax highlighting
    - Color-coded keys, strings, numbers, booleans, and null values
    - "Open in Editor" button to edit JSON in full VSCode editor
    - Copy formatted JSON to clipboard
  - Null value highlighting

#### Saved Queries
- **Global Query Storage**: Queries saved in VSCode app data (available across all projects)
- **Tree View Management**:
  - Browse all saved queries in sidebar
  - Create, edit, and delete queries
  - File system watcher for automatic updates
- **Query Metadata**: Add metadata via comments (`@name`, `@description`, `@tags`)

### Performance Optimizations
- **Golang Backend**: Native performance for database operations
- **Connection Pooling**: Optimized pool (25 max connections, 10 idle)
- **Intelligent Caching**:
  - Metadata cached for 30 seconds
  - All-tables cache preloaded on connect with 5-minute TTL
  - Individual table metadata cached
- **Memory Efficiency**: Pre-allocated buffers for query results
- **Context-based Cancellation**: Proper query cancellation without blocking

### Configuration Options
- `dataWarden.defaultRowLimit` - Default rows to fetch (default: 1000)
- `dataWarden.queryTimeout` - Query timeout in ms (default: 30000)
- `dataWarden.autoConnect` - Auto-connect on startup (default: true)
- `dataWarden.showSystemDatabases` - Show system databases (default: false)
- `dataWarden.confirmBeforeDelete` - Confirmation dialogs (default: true)
- `dataWarden.export.defaultFormat` - Default export format (default: json)
- `dataWarden.query.showExecutionTime` - Show execution time (default: true)

### Fixed
- **Connection Issues**: Fixed IPv6 localhost resolution on macOS by converting to 127.0.0.1
- **NULL Handling**: Fixed "converting NULL to string is unsupported" error in table metadata queries
- **Query Cancellation**: Fixed synchronous backend loop that prevented queries from being cancelled
- **Concurrent Requests**: Backend now handles multiple requests concurrently using goroutines
- **Large Database Performance**: Reduced 50+ listTables requests to single batched request
- **Empty UUID Columns**: Added heuristics to prevent false UUID detection in empty/text columns
- **JSON Encoding**: Fixed JSON content corruption in HTML attributes using base64 encoding

### Technical
- TypeScript + Vite bundler for extension (113.66 kB / 23.74 kB gzipped)
- Golang backend with JSON-RPC over stdio
- Concurrent request handling with mutex for thread safety
- Custom TTL support for cache entries
- UUID detection with smart heuristics
- Base64 encoding for preserving JSON in webviews

## [Unreleased]

### Planned for MVP
- Error handling improvements
- Better empty states
- Loading indicators
- Documentation improvements

### Future Features
- PostgreSQL support
- SQLite support
- Table operations (refresh, indexes, CREATE TABLE view)
- SSH tunnel support
- Query autocomplete with schema awareness
- GitHub Copilot integration

---

[0.1.1]: https://github.com/tazgreenwood/data-warden/releases/tag/v0.1.1
[0.1.0]: https://github.com/tazgreenwood/data-warden/releases/tag/v0.1.0
