/**
 * Shared table view HTML template for displaying query results
 * Used by both DataViewerPanel and Query Results
 */

export interface TableViewOptions {
    title: string;
    showPagination?: boolean;
    showSqlDisplay?: boolean;
    additionalButtons?: string; // Additional HTML for toolbar buttons
}

export function getTableViewHtml(options: TableViewOptions): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>${options.title}</title>
    <style>
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }

        #sql-display {
            padding: 12px;
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            margin: 10px;
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            white-space: pre-wrap;
            word-break: break-word;
            color: var(--vscode-descriptionForeground);
            max-height: 100px;
            overflow-y: auto;
            display: ${options.showSqlDisplay ? 'block' : 'none'};
        }

        #toolbar {
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        #info {
            flex: 1;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 2px;
            font-size: 12px;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button:active {
            opacity: 0.8;
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .pagination {
            display: ${options.showPagination ? 'flex' : 'none'};
            gap: 5px;
            align-items: center;
        }

        #container {
            width: 100%;
            height: calc(100vh - ${options.showSqlDisplay ? '120px' : '70px'});
            overflow: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            table-layout: auto;
        }

        th {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            font-weight: 600;
            text-align: left;
            padding: 8px;
            border: 1px solid var(--vscode-panel-border);
            position: sticky;
            top: 0;
            cursor: pointer;
            user-select: none;
            z-index: 10;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        th:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        th .sort-indicator {
            float: right;
            opacity: 0.5;
        }

        td {
            padding: 6px 8px;
            border: 1px solid var(--vscode-panel-border);
            cursor: pointer;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        td:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        td:focus {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: -2px;
            background-color: var(--vscode-list-focusBackground);
        }

        tr:nth-child(even) {
            background-color: var(--vscode-editor-background);
        }

        .null-value {
            color: var(--vscode-disabledForeground);
            font-style: italic;
        }

        /* Data type highlighting */
        .type-number {
            color: var(--vscode-debugTokenExpression-number);
            font-family: var(--vscode-editor-font-family);
        }

        .type-boolean {
            color: var(--vscode-debugTokenExpression-boolean);
            font-weight: 600;
        }

        .type-string {
            color: var(--vscode-debugTokenExpression-string);
        }

        .type-uuid {
            color: var(--vscode-textLink-foreground);
            font-family: 'Courier New', monospace;
            font-size: 11px;
        }

        .type-date {
            color: var(--vscode-debugTokenExpression-string);
            font-style: italic;
        }

        .type-json {
            color: var(--vscode-symbolIcon-objectForeground);
            font-family: var(--vscode-editor-font-family);
            cursor: pointer;
            position: relative;
        }

        .type-json:hover {
            text-decoration: underline;
        }

        .type-json::after {
            content: ' 🔍';
            font-size: 10px;
            opacity: 0.5;
        }

        .json-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .json-modal-content {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 20px;
            max-width: 80%;
            max-height: 80%;
            overflow: auto;
            position: relative;
        }

        .json-modal-close {
            position: absolute;
            top: 10px;
            right: 10px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            cursor: pointer;
            border-radius: 3px;
        }

        .json-modal-close:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .json-formatted {
            font-family: var(--vscode-editor-font-family);
            white-space: pre-wrap;
            word-break: break-word;
            color: var(--vscode-editor-foreground);
            font-size: 12px;
            line-height: 1.5;
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 3px;
        }

        /* JSON Syntax Highlighting */
        .json-key {
            color: var(--vscode-symbolIcon-keywordForeground, #569cd6);
        }

        .json-string {
            color: var(--vscode-debugTokenExpression-string, #ce9178);
        }

        .json-number {
            color: var(--vscode-debugTokenExpression-number, #b5cea8);
        }

        .json-boolean {
            color: var(--vscode-debugTokenExpression-boolean, #569cd6);
        }

        .json-null {
            color: var(--vscode-debugTokenExpression-boolean, #569cd6);
        }

        .json-punctuation {
            color: var(--vscode-editor-foreground);
        }

        .type-binary {
            color: var(--vscode-disabledForeground);
            font-family: 'Courier New', monospace;
            font-size: 10px;
        }

        #loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            min-height: 300px;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--vscode-panel-border);
            border-top-color: var(--vscode-progressBar-background);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 16px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .loading-text {
            font-size: 14px;
            margin-top: 8px;
        }

        #empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            min-height: 300px;
        }

        .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.4;
        }

        .empty-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 8px;
        }

        .empty-description {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            max-width: 400px;
            line-height: 1.5;
        }

        #error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
            min-height: 300px;
        }

        .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .error-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-errorForeground);
            margin-bottom: 12px;
        }

        .error-message {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            max-width: 500px;
            line-height: 1.6;
            margin-bottom: 20px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 12px;
            border-radius: 3px;
            text-align: left;
            word-break: break-word;
        }

        .error-actions {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }

        .error-actions button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 2px;
            font-size: 13px;
        }

        .error-actions button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        /* Context Menu */
        .context-menu {
            position: fixed;
            background-color: var(--vscode-menu-background);
            border: 1px solid var(--vscode-menu-border);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            min-width: 200px;
            padding: 4px 0;
            display: none;
        }

        .context-menu.show {
            display: block;
        }

        .context-menu-item {
            padding: 6px 12px;
            cursor: pointer;
            color: var(--vscode-menu-foreground);
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .context-menu-item:hover {
            background-color: var(--vscode-menu-selectionBackground);
            color: var(--vscode-menu-selectionForeground);
        }

        .context-menu-separator {
            height: 1px;
            background-color: var(--vscode-menu-separatorBackground);
            margin: 4px 0;
        }

        .context-menu-icon {
            opacity: 0.7;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div id="sql-display"></div>
    <div id="toolbar" role="toolbar" aria-label="Data table controls">
        <div id="info" role="status" aria-live="polite">Loading...</div>
        <div class="pagination" role="group" aria-label="Pagination controls">
            <button id="prevPage" disabled aria-label="Go to previous page">← Previous</button>
            <span id="pageInfo" aria-live="polite">Page 1</span>
            <button id="nextPage" disabled aria-label="Go to next page">Next →</button>
        </div>
        ${options.additionalButtons || ''}
        <button id="exportJson" aria-label="Export table data as JSON">Export JSON</button>
        <button id="exportCsv" aria-label="Export table data as CSV">Export CSV</button>
        <button id="refresh" aria-label="Refresh table data">Refresh</button>
    </div>
    <div id="container">
        <div id="loading">
            <div class="spinner"></div>
            <div class="loading-text">Loading data...</div>
        </div>
    </div>

    <!-- Context Menu -->
    <div id="contextMenu" class="context-menu">
        <div class="context-menu-item" data-action="copyCell">
            <span class="context-menu-icon">📋</span>
            <span>Copy Cell Value</span>
        </div>
        <div class="context-menu-item" data-action="copyRow">
            <span class="context-menu-icon">📄</span>
            <span>Copy Row (Tab-separated)</span>
        </div>
        <div class="context-menu-item" data-action="copyRowSQL">
            <span class="context-menu-icon">💾</span>
            <span>Copy as INSERT Statement</span>
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-action="copyColumn">
            <span class="context-menu-icon">⬇️</span>
            <span>Copy Column</span>
        </div>
        <div class="context-menu-item" data-action="copyColumnWithHeader">
            <span class="context-menu-icon">📊</span>
            <span>Copy Column (with header)</span>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let currentData = null;
        let currentOffset = 0;
        let currentLimit = 1000;
        let currentOrderBy = null;
        let currentOrderDirection = 'ASC';
        let currentDatabase = '';
        let currentTable = '';

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'data':
                    currentData = message.data;
                    currentOffset = message.offset || 0;
                    currentLimit = message.limit || 1000;
                    currentDatabase = message.database || '';
                    currentTable = message.table || '';
                    renderTable(message);
                    break;
                case 'error':
                    showError(message.message);
                    break;
            }
        });

        // Toolbar buttons
        document.getElementById('exportJson').addEventListener('click', () => {
            vscode.postMessage({ command: 'export', format: 'json' });
        });

        document.getElementById('exportCsv').addEventListener('click', () => {
            vscode.postMessage({ command: 'export', format: 'csv' });
        });

        document.getElementById('refresh').addEventListener('click', () => {
            loadData();
        });

        document.getElementById('prevPage').addEventListener('click', () => {
            if (currentOffset > 0) {
                currentOffset = Math.max(0, currentOffset - currentLimit);
                loadData();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            currentOffset += currentLimit;
            loadData();
        });

        function loadData() {
            vscode.postMessage({
                command: 'load',
                limit: currentLimit,
                offset: currentOffset,
                orderBy: currentOrderBy,
                orderDirection: currentOrderDirection
            });
        }

        function renderTable(message) {
            const data = message.data;
            const sql = message.sql;
            const container = document.getElementById('container');

            // Show SQL if provided
            if (sql) {
                document.getElementById('sql-display').textContent = sql;
                document.getElementById('sql-display').style.display = 'block';
            }

            // Update info
            const info = document.getElementById('info');
            const rowCount = data.rows?.length || 0;

            if (message.database && message.table) {
                // DataViewer mode
                info.textContent = \`\${message.database}.\${message.table} - \${data.rowsAffected?.toLocaleString() || rowCount.toLocaleString()} rows (\${data.executionTime}ms)\`;
            } else {
                // Query results mode
                info.textContent = \`\${rowCount.toLocaleString()} rows • \${data.executionTime}ms\`;
            }

            // Update pagination
            if (${options.showPagination ? 'true' : 'false'}) {
                const pageNum = Math.floor(currentOffset / currentLimit) + 1;
                document.getElementById('pageInfo').textContent = \`Page \${pageNum}\`;
                document.getElementById('prevPage').disabled = currentOffset === 0;
                document.getElementById('nextPage').disabled = data.rows?.length < currentLimit;
            }

            // Handle non-SELECT queries
            if (!data.columns || !data.rows) {
                container.innerHTML = \`
                    <div style="padding: 20px; text-align: center;">
                        <p>Query executed successfully</p>
                        <p>\${data.rowsAffected || 0} rows affected</p>
                    </div>
                \`;
                return;
            }

            // Handle empty result set
            if (data.rows.length === 0) {
                container.innerHTML = \`
                    <div id="empty-state">
                        <div class="empty-icon">📭</div>
                        <div class="empty-title">No Data Found</div>
                        <div class="empty-description">
                            This table doesn't contain any rows, or your query returned no results.
                        </div>
                    </div>
                \`;
                return;
            }

            // Build table
            let html = '<table role="grid" aria-label="Data table"><thead><tr role="row">';
            data.columns.forEach((col, index) => {
                const indicator = currentOrderBy === col
                    ? (currentOrderDirection === 'ASC' ? '↑' : '↓')
                    : '';
                const sortState = currentOrderBy === col
                    ? (currentOrderDirection === 'ASC' ? 'ascending' : 'descending')
                    : 'none';
                html += \`<th data-column="\${col}" data-index="\${index}" role="columnheader" aria-sort="\${sortState}">\${escapeHtml(col)}<span class="sort-indicator">\${indicator}</span></th>\`;
            });
            html += '</tr></thead><tbody>';

            data.rows.forEach(row => {
                html += '<tr role="row">';
                row.forEach((cell, cellIndex) => {
                    if (cell === null) {
                        html += '<td class="null-value" data-value="">NULL</td>';
                    } else {
                        let displayValue = String(cell);
                        const rawValue = displayValue;
                        let typeClass = '';

                        // Detect and format data types
                        const detectedType = detectDataType(cell, displayValue);
                        typeClass = detectedType.class;
                        const isJson = detectedType.type === 'json';

                        if (detectedType.type === 'uuid' && detectedType.formatted) {
                            displayValue = detectedType.formatted;
                        } else if (isJson && detectedType.formatted) {
                            displayValue = detectedType.formatted; // Truncated for display
                        }

                        const escaped = escapeHtml(displayValue);
                        // Store full raw value - use base64 encoding for JSON to preserve it properly
                        let dataAttr, dataValue;
                        if (isJson) {
                            // Encode JSON as base64 to preserve all characters in HTML attribute
                            dataValue = btoa(unescape(encodeURIComponent(rawValue)));
                            dataAttr = 'data-json-b64';
                        } else {
                            dataValue = escapeHtml(rawValue);
                            dataAttr = 'data-value';
                        }
                        html += \`<td class="\${typeClass}" \${dataAttr}="\${dataValue}" title="Click to \${isJson ? 'view full JSON' : 'copy'}">\${escaped}</td>\`;
                    }
                });
                html += '</tr>';
            });

            html += '</tbody></table>';
            container.innerHTML = html;

            // Add click handlers for cells
            container.querySelectorAll('td').forEach((td, index) => {
                // Make cells focusable for keyboard navigation
                td.setAttribute('tabindex', '0');
                td.setAttribute('role', 'gridcell');

                // Left click: Quick copy
                td.addEventListener('click', (e) => {
                    // Check if it's a JSON cell
                    const jsonValueB64 = td.getAttribute('data-json-b64');
                    if (jsonValueB64) {
                        // Decode base64 JSON
                        try {
                            const jsonValue = decodeURIComponent(escape(atob(jsonValueB64)));
                            showJsonModal(jsonValue);
                        } catch (e) {
                            console.error('Failed to decode JSON:', e);
                        }
                    } else {
                        const value = td.getAttribute('data-value') || '';
                        vscode.postMessage({ command: 'copyCell', value: value });
                    }
                });

                // Right click: Show context menu
                td.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    showContextMenu(e, td);
                });

                // Keyboard support: Enter/Space to activate (same as click)
                td.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        td.click();
                    }
                });
            });

            // Add arrow key navigation for table cells
            document.addEventListener('keydown', (e) => {
                const focused = document.activeElement;
                if (!focused || focused.tagName !== 'TD') return;

                let targetCell = null;
                const row = focused.parentElement;
                const cellIndex = Array.from(row.children).indexOf(focused);

                switch(e.key) {
                    case 'ArrowRight':
                        e.preventDefault();
                        targetCell = focused.nextElementSibling;
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        targetCell = focused.previousElementSibling;
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        const nextRow = row.nextElementSibling;
                        if (nextRow) targetCell = nextRow.children[cellIndex];
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        const prevRow = row.previousElementSibling;
                        if (prevRow) targetCell = prevRow.children[cellIndex];
                        break;
                }

                if (targetCell && targetCell.tagName === 'TD') {
                    targetCell.focus();
                }
            });

            // Add click handlers for column headers (sorting)
            container.querySelectorAll('th').forEach(th => {
                th.setAttribute('role', 'columnheader');
                th.setAttribute('aria-sort', 'none');

                th.addEventListener('click', () => {
                    const column = th.getAttribute('data-column');
                    if (currentOrderBy === column) {
                        currentOrderDirection = currentOrderDirection === 'ASC' ? 'DESC' : 'ASC';
                    } else {
                        currentOrderBy = column;
                        currentOrderDirection = 'ASC';
                    }

                    // If pagination is enabled, reload from server
                    // Otherwise, sort client-side
                    if (${options.showPagination ? 'true' : 'false'}) {
                        loadData();
                    } else {
                        sortTable(column, currentOrderDirection);
                    }
                });
            });
        }

        function sortTable(column, direction) {
            if (!currentData || !currentData.columns || !currentData.rows) return;

            const columnIndex = currentData.columns.indexOf(column);
            if (columnIndex === -1) return;

            const sortedRows = [...currentData.rows].sort((a, b) => {
                const valA = a[columnIndex];
                const valB = b[columnIndex];

                // Handle nulls
                if (valA === null && valB === null) return 0;
                if (valA === null) return direction === 'ASC' ? 1 : -1;
                if (valB === null) return direction === 'ASC' ? -1 : 1;

                // Compare values
                if (valA < valB) return direction === 'ASC' ? -1 : 1;
                if (valA > valB) return direction === 'ASC' ? 1 : -1;
                return 0;
            });

            // Update current data and re-render
            currentData.rows = sortedRows;
            const sql = document.getElementById('sql-display').textContent;
            renderTable({
                data: currentData,
                sql: sql,
                database: currentDatabase,
                table: currentTable
            });
        }

        // Context Menu Functions
        let contextMenuCell = null;

        function showContextMenu(event, cell) {
            const menu = document.getElementById('contextMenu');
            contextMenuCell = cell;

            menu.style.left = event.pageX + 'px';
            menu.style.top = event.pageY + 'px';
            menu.classList.add('show');
        }

        function hideContextMenu() {
            const menu = document.getElementById('contextMenu');
            menu.classList.remove('show');
            contextMenuCell = null;
        }

        // Hide context menu on click elsewhere
        document.addEventListener('click', hideContextMenu);
        document.addEventListener('contextmenu', (e) => {
            if (!e.target.closest('td')) {
                hideContextMenu();
            }
        });

        // Handle context menu actions
        document.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.getAttribute('data-action');
                if (contextMenuCell) {
                    handleContextMenuAction(action, contextMenuCell);
                }
                hideContextMenu();
            });
        });

        function handleContextMenuAction(action, cell) {
            const row = cell.parentElement;
            const cellIndex = Array.from(row.children).indexOf(cell);
            const tbody = row.parentElement;
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const rowIndex = rows.indexOf(row);

            switch(action) {
                case 'copyCell':
                    // Get value and copy
                    const value = cell.getAttribute('data-value') || cell.getAttribute('data-json-b64') ? 'JSON' : '';
                    vscode.postMessage({ command: 'copyCell', value: value });
                    break;

                case 'copyRow':
                    // Copy all cell values in row, tab-separated
                    const rowValues = Array.from(row.children).map(td => {
                        return td.getAttribute('data-value') || 'NULL';
                    }).join('\\t');
                    vscode.postMessage({ command: 'copyCell', value: rowValues });
                    break;

                case 'copyRowSQL':
                    // Copy row as SQL INSERT statement
                    if (currentData && currentData.columns) {
                        const tableName = currentTable || 'table_name';
                        const columns = currentData.columns.join(', ');
                        const values = currentData.rows[rowIndex].map(v => {
                            if (v === null) return 'NULL';
                            if (typeof v === 'string') return "'" + v.replace(/'/g, "''") + "'";
                            return String(v);
                        }).join(', ');
                        const sql = \`INSERT INTO \${tableName} (\${columns}) VALUES (\${values});\`;
                        vscode.postMessage({ command: 'copyCell', value: sql });
                    }
                    break;

                case 'copyColumn':
                    // Request column copy from backend
                    vscode.postMessage({
                        command: 'copyColumn',
                        columnIndex: cellIndex,
                        withHeader: false
                    });
                    break;

                case 'copyColumnWithHeader':
                    // Request column copy with header
                    vscode.postMessage({
                        command: 'copyColumn',
                        columnIndex: cellIndex,
                        withHeader: true
                    });
                    break;
            }
        }

        function showError(message) {
            const container = document.getElementById('container');
            container.innerHTML = \`
                <div id="error">
                    <div class="error-icon">⚠️</div>
                    <div class="error-title">Error Loading Data</div>
                    <div class="error-message">\${escapeHtml(message)}</div>
                    <div class="error-actions">
                        <button onclick="vscode.postMessage({ command: 'load', limit: currentLimit, offset: currentOffset })">Retry</button>
                    </div>
                </div>
            \`;
        }

        function escapeHtml(text) {
            if (text === undefined || text === null) return '';
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        }

        function showJsonModal(jsonString) {
            console.log('Opening JSON modal with:', jsonString ? jsonString.substring(0, 100) : 'empty');

            // Create modal
            const modal = document.createElement('div');
            modal.className = 'json-modal';

            let formattedJson = jsonString;
            try {
                // Try to pretty-print the JSON
                const parsed = JSON.parse(jsonString);
                formattedJson = JSON.stringify(parsed, null, 2);
            } catch (e) {
                console.error('Failed to parse JSON:', e);
                formattedJson = jsonString; // Show as-is if parsing fails
            }

            const modalContent = document.createElement('div');
            modalContent.className = 'json-modal-content';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'json-modal-close';
            closeBtn.textContent = '✕ Close';

            const title = document.createElement('h3');
            title.style.marginTop = '0';
            title.style.color = 'var(--vscode-foreground)';
            title.textContent = 'JSON Content';

            const pre = document.createElement('pre');
            pre.className = 'json-formatted';
            pre.innerHTML = highlightJson(formattedJson);

            // Button container
            const btnContainer = document.createElement('div');
            btnContainer.style.marginTop = '10px';
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '10px';

            const copyBtn = document.createElement('button');
            copyBtn.style.background = 'var(--vscode-button-background)';
            copyBtn.style.color = 'var(--vscode-button-foreground)';
            copyBtn.style.border = 'none';
            copyBtn.style.padding = '8px 16px';
            copyBtn.style.cursor = 'pointer';
            copyBtn.style.borderRadius = '3px';
            copyBtn.textContent = 'Copy to Clipboard';

            const openBtn = document.createElement('button');
            openBtn.style.background = 'var(--vscode-button-secondaryBackground)';
            openBtn.style.color = 'var(--vscode-button-secondaryForeground)';
            openBtn.style.border = 'none';
            openBtn.style.padding = '8px 16px';
            openBtn.style.cursor = 'pointer';
            openBtn.style.borderRadius = '3px';
            openBtn.textContent = 'Open in Editor';

            btnContainer.appendChild(copyBtn);
            btnContainer.appendChild(openBtn);

            modalContent.appendChild(closeBtn);
            modalContent.appendChild(title);
            modalContent.appendChild(pre);
            modalContent.appendChild(btnContainer);
            modal.appendChild(modalContent);

            document.body.appendChild(modal);

            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });

            // Close button
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });

            // Copy button
            copyBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'copyCell', value: formattedJson });
            });

            // Open in editor button
            openBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'openJson', value: formattedJson });
                document.body.removeChild(modal);
            });
        }

        function highlightJson(json) {
            // Simple JSON syntax highlighter
            return json
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/("(?:[^"\\\\]|\\\\.)*")\s*:/g, '<span class="json-key">$1</span>:')
                .replace(/:\s*("(?:[^"\\\\]|\\\\.)*")/g, ': <span class="json-string">$1</span>')
                .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
                .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
                .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>')
                .replace(/([{}[\],])/g, '<span class="json-punctuation">$1</span>');
        }

        // Data type detection
        function detectDataType(rawCell, stringValue) {
            // Numbers
            if (typeof rawCell === 'number' || (!isNaN(Number(stringValue)) && stringValue.trim() !== '')) {
                return { type: 'number', class: 'type-number' };
            }

            // Booleans
            if (typeof rawCell === 'boolean' || stringValue === 'true' || stringValue === 'false' || stringValue === '0' || stringValue === '1') {
                if (stringValue === 'true' || stringValue === 'false') {
                    return { type: 'boolean', class: 'type-boolean' };
                }
            }

            // UUIDs
            if (isLikelyUuid(stringValue)) {
                const formatted = tryFormatUuid(stringValue);
                return {
                    type: 'uuid',
                    class: 'type-uuid',
                    formatted: formatted || stringValue
                };
            }

            // Dates (ISO 8601 format or MySQL DATETIME)
            if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
                return { type: 'date', class: 'type-date' };
            }

            // JSON (starts with { or [)
            if ((stringValue.trim().startsWith('{') && stringValue.trim().endsWith('}')) ||
                (stringValue.trim().startsWith('[') && stringValue.trim().endsWith(']'))) {
                try {
                    JSON.parse(stringValue);
                    // Compact format for display
                    const compacted = stringValue.length > 100
                        ? stringValue.substring(0, 100) + '...'
                        : stringValue;
                    return {
                        type: 'json',
                        class: 'type-json',
                        formatted: compacted
                    };
                } catch (e) {
                    // Not valid JSON
                }
            }

            // Binary data (base64 or hex)
            if (/^[0-9a-fA-F]+$/.test(stringValue) && stringValue.length > 32 && stringValue.length % 2 === 0) {
                return { type: 'binary', class: 'type-binary' };
            }

            // Default: string
            return { type: 'string', class: 'type-string' };
        }

        // UUID detection and formatting
        function isLikelyUuid(value) {
            if (!value || typeof value !== 'string') return false;

            // Already a UUID string (8-4-4-4-12)
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                return true;
            }

            // 32 hex characters (UUID without dashes)
            if (/^[0-9a-f]{32}$/i.test(value)) {
                return true;
            }

            // Base64 encoded 16 bytes (length 22-24)
            if (value.length >= 22 && value.length <= 24 && /^[A-Za-z0-9+/]+=*$/.test(value)) {
                return true;
            }

            return false;
        }

        function tryFormatUuid(value) {
            if (!value) return null;

            // Already formatted
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                return value.toLowerCase();
            }

            // 32 hex characters without dashes
            if (/^[0-9a-f]{32}$/i.test(value)) {
                return value.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5').toLowerCase();
            }

            // Try base64 decode
            if (value.length >= 22 && value.length <= 24) {
                try {
                    const hex = atob(value).split('').map(c =>
                        c.charCodeAt(0).toString(16).padStart(2, '0')
                    ).join('');

                    if (hex.length === 32) {
                        return hex.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
                    }
                } catch (e) {
                    // Not valid base64
                }
            }

            return null;
        }
    </script>
</body>
</html>
    `;
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
