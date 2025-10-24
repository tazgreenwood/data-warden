# Development Guide

This guide helps contributors understand the codebase and implement new features.

## Architecture Overview

Data Warden uses a client-server architecture:

```
┌─────────────────────────────────────────┐
│      VSCode Extension (TypeScript)      │
│  ┌────────────────────────────────────┐ │
│  │  UI Layer (Commands, TreeView)    │ │
│  └────────────┬───────────────────────┘ │
│  ┌────────────▼───────────────────────┐ │
│  │  Services (ConnectionManager)     │ │
│  └────────────┬───────────────────────┘ │
│  ┌────────────▼───────────────────────┐ │
│  │  Backend Client (JSON-RPC)        │ │
│  └────────────┬───────────────────────┘ │
└───────────────┼─────────────────────────┘
                │ stdio
┌───────────────▼─────────────────────────┐
│      Golang Backend (Native)            │
│  ┌────────────────────────────────────┐ │
│  │  Server (Request Handler)         │ │
│  └────────────┬───────────────────────┘ │
│  ┌────────────▼───────────────────────┐ │
│  │  Connection Pool                  │ │
│  └────────────┬───────────────────────┘ │
└───────────────┼─────────────────────────┘
                │ SQL
         ┌──────▼────────┐
         │    Database   │
         └───────────────┘
```

## Key Design Patterns

### 1. JSON-RPC Communication
All communication between the extension and backend uses JSON-RPC 2.0:

```typescript
// Frontend sends request
const result = await backendClient.sendRequest('methodName', params);

// Backend handles request
func (s *Server) HandleRequest(req *protocol.Request) *protocol.Response
```

### 2. SecretStorage for Credentials
Passwords are never stored in plain text:

```typescript
// Store password
await context.secrets.store(`dataWarden.connection.${id}.password`, password);

// Retrieve password
const password = await context.secrets.get(`dataWarden.connection.${id}.password`);
```

### 3. Tree View with Lazy Loading
The sidebar loads data on-demand as nodes are expanded:

```typescript
async getChildren(element?: DatabaseTreeItem): Promise<DatabaseTreeItem[]> {
    if (!element) return this.getConnectionItems();
    // Load children based on element type
}
```

## Adding a New Feature

### Example: Add "Copy Table Name" Command

#### 1. Add to package.json
```json
{
  "command": "dataWarden.copyTableName",
  "title": "Copy Table Name"
}
```

#### 2. Add to context menu
```json
{
  "command": "dataWarden.copyTableName",
  "when": "view == dataWardenExplorer && viewItem == table"
}
```

#### 3. Register command in extension.ts
```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('dataWarden.copyTableName', async (item) => {
        await vscode.env.clipboard.writeText(item.label);
        vscode.window.showInformationMessage(`Copied: ${item.label}`);
    })
);
```

### Example: Add Backend Method

#### 1. Define request/response types (protocol/types.go)
```go
type GetTableInfoRequest struct {
    ConnectionID string `json:"connectionId"`
    Database     string `json:"database"`
    Table        string `json:"table"`
}

type TableInfo struct {
    Name       string `json:"name"`
    Engine     string `json:"engine"`
    RowCount   int64  `json:"rowCount"`
    CreateTime string `json:"createTime"`
}
```

#### 2. Add method handler (server/server.go)
```go
case "getTableInfo":
    result, err := s.handleGetTableInfo(req.Params)
    if err != nil {
        response.Error = &protocol.Error{
            Code:    protocol.InternalError,
            Message: err.Error(),
        }
    } else {
        response.Result = result
    }
```

#### 3. Implement handler
```go
func (s *Server) handleGetTableInfo(params json.RawMessage) (*protocol.TableInfo, error) {
    var req protocol.GetTableInfoRequest
    if err := json.Unmarshal(params, &req); err != nil {
        return nil, fmt.Errorf("invalid parameters: %w", err)
    }

    conn := s.getConnection(req.ConnectionID)
    if conn == nil {
        return nil, fmt.Errorf("connection not found: %s", req.ConnectionID)
    }

    return conn.GetTableInfo(req.Database, req.Table)
}
```

#### 4. Implement in connection layer (connection/mysql.go)
```go
func (c *Connection) GetTableInfo(database, table string) (*protocol.TableInfo, error) {
    query := fmt.Sprintf("SHOW TABLE STATUS FROM `%s` WHERE Name = ?", database)
    // ... implementation
}
```

#### 5. Call from frontend
```typescript
const tableInfo = await backendClient.sendRequest('getTableInfo', {
    connectionId: conn.id,
    database: 'mydb',
    table: 'users'
});
```

## Code Organization

### Frontend (src/)
```
src/
├── commands/           # Command implementations
│   ├── addConnection.ts
│   └── switchConnection.ts
├── providers/          # VSCode providers
│   └── databaseTreeProvider.ts
├── services/           # Core business logic
│   ├── backendClient.ts
│   └── connectionManager.ts
├── types/              # TypeScript type definitions
│   └── index.ts
└── extension.ts        # Entry point
```

### Backend (backend/)
```
backend/
├── cmd/server/         # Entry point
│   └── main.go
├── internal/
│   ├── connection/     # Database adapters
│   │   └── mysql.go
│   ├── protocol/       # Shared types
│   │   └── types.go
│   └── server/         # Request handling
│       └── server.go
├── go.mod
└── go.sum
```

## Common Tasks

### Adding a New Database Type

1. **Create adapter** in `backend/internal/connection/`:
   ```go
   // postgresql.go
   func NewPostgreSQLConnection(config *protocol.ConnectionConfig) (*Connection, error)
   ```

2. **Update ConnectionConfig** in `protocol/types.go`:
   ```go
   Type string `json:"type"` // "mysql", "postgresql", etc.
   ```

3. **Update connection factory** in `connection/`:
   ```go
   switch config.Type {
   case "mysql":
       return NewMySQLConnection(config)
   case "postgresql":
       return NewPostgreSQLConnection(config)
   }
   ```

4. **Add to frontend types** in `src/types/index.ts`:
   ```typescript
   type: 'mysql' | 'postgresql';
   ```

### Adding a Webview

1. **Create webview directory**: `src/webviews/myFeature/`
2. **Create HTML/JS**: Build UI (can use React, Vue, or vanilla)
3. **Create provider**: `src/providers/myFeatureProvider.ts`
4. **Register in extension.ts**:
   ```typescript
   const provider = new MyFeatureProvider(context);
   context.subscriptions.push(
       vscode.window.registerWebviewViewProvider('myFeature', provider)
   );
   ```

### Adding Configuration

1. **Add to package.json**:
   ```json
   "dataWarden.myFeature.enabled": {
       "type": "boolean",
       "default": true,
       "description": "Enable my feature"
   }
   ```

2. **Read in code**:
   ```typescript
   const config = vscode.workspace.getConfiguration('dataWarden');
   const enabled = config.get<boolean>('myFeature.enabled', true);
   ```

## Testing

### Manual Testing
1. Build: `npm run build`
2. Press F5 to launch Extension Host
3. Test your changes

### Unit Testing (Future)
```bash
npm test
```

### Backend Testing
```bash
cd backend
go test ./...
```

## Debugging Tips

### Extension Debugging
- Set breakpoints in `.ts` files
- Use Debug Console in Extension Host window
- Check "Debug Console" panel for logs

### Backend Debugging
- Logs go to Output panel → "Data Warden Backend"
- Add `log.Printf()` statements in Go code
- Rebuild backend after changes: `npm run build:backend`

### Common Issues

**Backend not starting:**
- Check if binary exists: `ls -l dist/backend`
- Check permissions: `chmod +x dist/backend`
- View logs in Output panel

**Changes not reflected:**
- Rebuild: `npm run build`
- Reload extension: Ctrl+R in Extension Host
- Restart VSCode if needed

**TypeScript errors:**
- Run: `npm run lint`
- Check: `tsc --noEmit`

## Performance Guidelines

### Frontend
- Use lazy loading for tree views
- Debounce search inputs
- Limit concurrent backend requests
- Cache results when appropriate

### Backend
- Use connection pooling (already configured)
- Stream large result sets
- Add query timeouts
- Limit result set sizes with LIMIT

### Webviews
- Use virtual scrolling for large tables
- Debounce user interactions
- Minimize postMessage calls
- Lazy load images/content

## Best Practices

### TypeScript
- Use strict mode
- Define types for all data
- Avoid `any` type
- Use async/await over callbacks

### Go
- Follow standard Go conventions
- Use error wrapping: `fmt.Errorf("context: %w", err)`
- Close resources with defer
- Add context for cancellation

### Git Workflow
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. Push and create PR
4. Address review comments
5. Merge when approved

## Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [JSON-RPC 2.0 Spec](https://www.jsonrpc.org/specification)
- [Go database/sql](https://pkg.go.dev/database/sql)
- [Vite Documentation](https://vitejs.dev/)

## Getting Help

- Check [SETUP.md](../SETUP.md) for setup issues
- Review [ROADMAP.md](../ROADMAP.md) for feature roadmap
- Open an issue on GitHub
