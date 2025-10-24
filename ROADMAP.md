# Data Warden - Roadmap

> **Current Version**: 0.1.0
> **Status**: MVP Complete 🎉 - Ready for Launch

---

## 🎯 Current Features (v0.1.0)

### Connection Management
- ✅ Add/Edit/Delete database connections
- ✅ Secure password storage (VSCode SecretStorage API)
- ✅ Test connections before saving
- ✅ Switch between multiple connections
- ✅ Auto-connect to last active connection
- ✅ Connection status indicator in status bar
- ✅ SSL/TLS support

### Database Explorer
- ✅ Tree view navigation (connections → databases → tables → columns)
- ✅ Context menus for all operations
- ✅ Table metadata (row counts, sizes, types)
- ✅ System database filtering
- ✅ Quick Table Search (`Cmd+Shift+T`) - search across all tables instantly
- ✅ Cache preloading for instant results

### Query Editor
- ✅ SQL syntax highlighting and autocomplete
- ✅ Execute with `Cmd+Enter` or button
- ✅ Execute selected text
- ✅ `.dwquery` file format with auto-save
- ✅ **Query cancellation** - stop long-running queries instantly
- ✅ **Query history** - tracks last 20 queries with timestamps
- ✅ **Query templates** - 16 built-in SQL patterns
- ✅ **Format SQL** - integrates with VSCode formatter extensions
- ✅ **Duplicate queries** - quick copy command
- ✅ Progress notifications with elapsed time
- ✅ Results viewer with sortable columns
- ✅ Export results to JSON/CSV

### Data Viewer
- ✅ View and browse table data
- ✅ Pagination (default 1000 rows)
- ✅ Sortable columns (click headers)
- ✅ Copy cells, rows, or columns
- ✅ Copy as SQL INSERT statements
- ✅ Context menu for all copy options
- ✅ Export to JSON/CSV
- ✅ Large export warnings (>10k rows)
- ✅ **Smart data type handling**:
  - Binary16 UUID auto-detection and formatting
  - JSON viewer with syntax highlighting and modal popup
  - Open JSON in editor for full editing
  - Null value highlighting
- ✅ Keyboard navigation (arrow keys, Tab, Enter)
- ✅ Accessibility (ARIA labels, screen reader support)

### Saved Queries
- ✅ Global query storage
- ✅ Tree view in sidebar
- ✅ Create/Delete queries
- ✅ Query metadata via comments (`@name`, `@description`, `@tags`)

### Performance
- ✅ Golang backend for native performance
- ✅ Connection pooling (25 max, 10 idle)
- ✅ Intelligent caching (configurable TTL)
- ✅ Concurrent request handling
- ✅ Context-based cancellation
- ✅ Small bundle size (113.66 kB / 23.74 kB gzipped)

---

## 🚀 Future Roadmap

### Phase 1: Launch & Polish (v0.2.0)
**Target: Q1 2025**

#### Launch Preparation
- [ ] Publish to VSCode Marketplace
- [ ] Open source on GitHub (MIT License)
- [ ] Add screenshots/GIFs to README
- [ ] Create demo video
- [ ] Add icon/logo
- [ ] Set up GitHub Actions for CI/CD

#### Community Building
- [ ] Create CONTRIBUTING.md
- [ ] Add issue templates
- [ ] Add pull request template
- [ ] Create CODE_OF_CONDUCT.md
- [ ] Set up GitHub Sponsors / Ko-fi

#### Quick Wins
- [ ] Query syntax validation
- [ ] Cache warming progress indicator
- [ ] Export selected rows only

---

### Phase 2: Enhanced Functionality (v0.3.0)
**Target: Q2 2025**

#### Table Operations
- [ ] View table indexes
- [ ] Show CREATE TABLE statement
- [ ] Table statistics and analysis
- [ ] Refresh individual table metadata
- [ ] Truncate/Drop table (with confirmation)

#### Enhanced Query Features
- [ ] Query autocomplete with schema awareness
  - Table name suggestions
  - Column name suggestions (context-aware)
  - Function signatures
- [ ] Query parameters/variables (`{{variable}}` syntax)
- [ ] Query explain/analyze
- [ ] Execution plan visualization
- [ ] Query snippets (user-defined)

#### Data Editing
- [ ] Edit cell values inline
- [ ] Add new rows
- [ ] Delete rows
- [ ] Transaction support (BEGIN/COMMIT/ROLLBACK)
- [ ] Undo/Redo for data changes

---

### Phase 3: Multi-Database Support (v0.4.0)
**Target: Q3 2025**

#### PostgreSQL Support 🔥
- [ ] Connection support
- [ ] Schema navigation
- [ ] PostgreSQL-specific data types (JSONB, ARRAY, etc.)
- [ ] View definitions
- [ ] Function/Procedure support

#### SQLite Support
- [ ] File-based connections
- [ ] In-memory database support
- [ ] Attach multiple databases
- [ ] Vacuum and optimization commands

---

### Phase 4: Advanced Features (v0.5.0+)
**Target: Q4 2025 & Beyond**

#### Performance & Analysis
- [ ] Query profiling
- [ ] Slow query log analysis
- [ ] Index recommendations
- [ ] Query optimization suggestions
- [ ] Connection pool monitoring

#### Collaboration
- [ ] Share queries (export/import)
- [ ] Team query library
- [ ] Query versioning
- [ ] Comments on queries
- [ ] GitHub Gist integration

#### Automation
- [ ] Scheduled queries
- [ ] Export automation
- [ ] Data sync jobs
- [ ] Backup automation
- [ ] Migration scripts

#### Security
- [ ] SSH tunnel support
- [ ] Bastion host configuration
- [ ] Role-based access (read-only mode)
- [ ] Audit logging
- [ ] Query approval workflow

#### Integration
- [ ] GitHub Copilot integration
  - Natural language to SQL
  - Query explanation
  - Optimization suggestions
- [ ] REST API testing (data-driven tests)
- [ ] GraphQL query builder
- [ ] Export to Markdown/HTML/LaTeX tables

---

## 📊 Database Support

| Database   | Status      | Priority | Target Version |
| ---------- | ----------- | -------- | -------------- |
| MySQL      | ✅ Complete | -        | v0.1.0         |
| MariaDB    | ✅ Complete | -        | v0.1.0         |
| PostgreSQL | 📋 Planned  | High     | v0.4.0         |
| SQLite     | 📋 Planned  | Medium   | v0.4.0         |
| MongoDB    | 📋 Future   | Low      | TBD            |
| SQL Server | 📋 Future   | Low      | TBD            |

---

## 💡 How to Contribute

We welcome contributions! Here's how you can help:

1. **Bug Reports**: Open an issue with reproduction steps
2. **Feature Requests**: Check the roadmap, then open an issue
3. **Code Contributions**: Pick an item from the roadmap and open a PR
4. **Documentation**: Improve README, add tutorials, create videos
5. **Testing**: Test with different MySQL versions and configurations

**Good First Issues**: Items marked with 🔥 are great for new contributors.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📈 Performance Targets

| Metric               | Current | Target | Status |
| -------------------- | ------- | ------ | ------ |
| Extension activation | <1s     | <500ms | ✅     |
| Connection time      | ~1s     | <2s    | ✅     |
| Quick search         | <100ms  | <50ms  | ✅     |
| Query <1000 rows     | <500ms  | <1s    | ✅     |
| Query 10k rows       | ~2s     | <5s    | ✅     |
| Bundle size          | 113 kB  | <150kB | ✅     |
| Memory usage         | ~50MB   | <100MB | ✅     |

---

## 🎯 Next Steps

**Immediate (This Week)**:
1. Publish to VSCode Marketplace
2. Open source on GitHub with proper documentation
3. Create promotional materials (screenshots, demo video)

**Short Term (Next Month)**:
1. Gather user feedback
2. Fix critical bugs
3. Build community around the project

**Long Term (Next Quarter)**:
1. Add PostgreSQL support
2. Enhanced query features
3. Data editing capabilities

---

**Last Updated**: 2025-10-24
**Current Focus**: Launch Preparation 🚀
