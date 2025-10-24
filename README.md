# Data Warden

A fast, intuitive database management extension for Visual Studio Code. Built with performance in mind using TypeScript and a Golang backend.

## Features

### 🔍 Quick Table Search
Press `Cmd+Shift+T` (or `Ctrl+Shift+T` on Windows/Linux) to instantly search across all tables in your database. See row counts and table sizes at a glance.

### 📊 Database Explorer
Browse your database structure in the sidebar with an intuitive tree view:
- Connections
- Databases
- Tables with metadata (row counts, sizes)
- Columns with types and constraints

### 💾 Connection Management
Securely store and manage multiple database connections:
- Encrypted password storage using VSCode SecretStorage
- Test connections before saving
- Easy switching between connections
- SSL support

### ✏️ Query Editor
Write and execute SQL queries with a feature-rich editor:
- SQL syntax highlighting and autocomplete
- Execute with `Cmd+Enter` or button
- Execute selected text
- **Query cancellation** - Stop long-running queries instantly
- Interactive results viewer with sorting
- Click cells to copy values
- Export results to JSON or CSV
- Save queries globally for reuse across projects
- **Query history** - Automatically tracks last 20 queries with timestamps
- **Query templates** - 16 common SQL patterns (SELECT, JOIN, INSERT, UPDATE, etc.)
- **Format SQL** - Integrates with VSCode SQL formatter extensions
- **Duplicate queries** - Quick copy command for existing query files

### 📈 Interactive Data Viewer
View and explore table data with powerful features:
- Sortable columns
- Paginated results for large datasets
- Copy cells, rows, or entire columns
- Export to JSON or CSV (CSV files can be imported to Excel)
- Large export warnings for datasets over 10k rows
- Null value highlighting
- **Smart data type handling**:
  - Binary16 UUID columns automatically formatted
  - JSON columns with syntax highlighting and modal viewer
  - Open JSON in editor for full editing capabilities

## Getting Started

### Installation

1. Open Visual Studio Code
2. Go to Extensions (Cmd+Shift+X)
3. Search for "Data Warden"
4. Click Install

### Adding Your First Connection

1. Click the Data Warden icon in the Activity Bar
2. Click the "+" button to add a new connection
3. Follow the prompts to enter:
   - Connection name
   - Host (e.g., `localhost`)
   - Port (default: `3306`)
   - Username
   - Password (stored securely)
   - Default database (optional)
   - SSL options
4. Test the connection and save

### Quick Start

Once connected, you can:

- **Browse databases**: Click to expand databases and tables in the sidebar
- **View table data**: Right-click a table → "View Data"
- **Quick search**: Press `Cmd+Shift+T` and start typing to find tables
- **Create a query**: Click the "+" button in Saved Queries section
- **Execute queries**: Open a `.dwquery` file and press `Cmd+Enter`

## Keyboard Shortcuts

| Command | macOS | Windows/Linux |
|---------|-------|---------------|
| Quick Table Search | `Cmd+Shift+T` | `Ctrl+Shift+T` |
| Execute Query | `Cmd+Enter` | `Ctrl+Enter` |

## Configuration

Customize Data Warden in your VSCode settings:

```json
{
  "dataWarden.defaultRowLimit": 1000,
  "dataWarden.queryTimeout": 30000,
  "dataWarden.autoConnect": true,
  "dataWarden.showSystemDatabases": false,
  "dataWarden.confirmBeforeDelete": true,
  "dataWarden.export.defaultFormat": "json"
}
```

### Available Settings

- **dataWarden.defaultRowLimit**: Default number of rows to fetch (default: 1000)
- **dataWarden.queryTimeout**: Query execution timeout in milliseconds (default: 30000)
- **dataWarden.autoConnect**: Automatically connect to last active connection on startup
- **dataWarden.showSystemDatabases**: Show system databases in explorer
- **dataWarden.confirmBeforeDelete**: Show confirmation before deleting
- **dataWarden.export.defaultFormat**: Default export format (`json` or `csv`)
- **dataWarden.query.showExecutionTime**: Show query execution time in results

## Saved Queries

Queries are saved globally in your VSCode application data directory, making them available across all projects.

### Query Metadata

Add metadata to your queries using comments:

```sql
-- @name: Get Active Users
-- @description: Fetches all active users from the last 30 days
-- @tags: users, reporting

SELECT * FROM users
WHERE last_login > DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## Database Support

Currently supported:
- **MySQL** / **MariaDB**

Coming soon:
- PostgreSQL
- SQLite
- MongoDB

## Performance

Data Warden is built for speed:
- **Golang backend**: Native performance for database operations
- **Connection pooling**: Optimized connection reuse (25 max connections, 10 idle)
- **Intelligent caching**:
  - Metadata cached for 30 seconds
  - All-tables cache preloaded on connect (5-minute TTL)
  - Instant quick search across hundreds of databases
- **Query cancellation**: Context-based cancellation for responsive UI
- **Memory-efficient**: Pre-allocated buffers and streaming results

## Security

Your database credentials are stored securely:
- Passwords encrypted using VSCode SecretStorage API
- No plaintext passwords in configuration files
- SSL connection support
- Workspace-scoped connections

## Troubleshooting

### Connection Issues

If you can't connect to your database:

1. **Check if the database server is running**
2. **Verify host and port** - Use `127.0.0.1` instead of `localhost` if having issues
3. **Check credentials** - Ensure username and password are correct
4. **Firewall settings** - Make sure the port is not blocked
5. **View logs** - Check the "Data Warden Backend" output channel for detailed errors

### Performance Issues

If queries are slow:

1. **Check query complexity** - Use EXPLAIN to analyze queries
2. **Adjust row limit** - Lower `dataWarden.defaultRowLimit` for faster loads
3. **Network latency** - Connection speed affects performance
4. **Database indexes** - Ensure your tables are properly indexed

### Error Messages

Click "View Logs" in error dialogs to see detailed information in the Output panel.

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Watch for changes during development
npm run watch
```

### Project Structure

- `src/` - TypeScript extension code
- `backend/` - Golang backend for database operations
- `media/` - Icons and assets
- `ROADMAP.md` - Project roadmap and future features

## Contributing

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/tazgreenwood/data-warden/issues).

## License

MIT License - see LICENSE file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes and version history.

---

**Made with ❤️ by developers, for developers**
