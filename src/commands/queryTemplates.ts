import * as vscode from 'vscode';

interface QueryTemplate {
    label: string;
    description: string;
    template: string;
}

const templates: QueryTemplate[] = [
    {
        label: 'SELECT - Basic Query',
        description: 'Select all columns from a table',
        template: `SELECT *
FROM table_name
WHERE condition
LIMIT 100;`
    },
    {
        label: 'SELECT - With JOIN',
        description: 'Join two tables',
        template: `SELECT
    t1.column1,
    t1.column2,
    t2.column3
FROM table1 t1
INNER JOIN table2 t2 ON t1.id = t2.table1_id
WHERE t1.condition
LIMIT 100;`
    },
    {
        label: 'INSERT - Single Row',
        description: 'Insert a single row',
        template: `INSERT INTO table_name (column1, column2, column3)
VALUES (value1, value2, value3);`
    },
    {
        label: 'INSERT - Multiple Rows',
        description: 'Insert multiple rows',
        template: `INSERT INTO table_name (column1, column2, column3)
VALUES
    (value1a, value2a, value3a),
    (value1b, value2b, value3b),
    (value1c, value2c, value3c);`
    },
    {
        label: 'UPDATE - Basic',
        description: 'Update existing rows',
        template: `UPDATE table_name
SET
    column1 = value1,
    column2 = value2
WHERE condition
LIMIT 1000;`
    },
    {
        label: 'UPDATE - With JOIN',
        description: 'Update based on another table',
        template: `UPDATE table1 t1
INNER JOIN table2 t2 ON t1.id = t2.table1_id
SET
    t1.column1 = t2.column2,
    t1.updated_at = NOW()
WHERE t2.condition;`
    },
    {
        label: 'DELETE - Basic',
        description: 'Delete rows from table',
        template: `DELETE FROM table_name
WHERE condition
LIMIT 1000;`
    },
    {
        label: 'SELECT - Aggregation',
        description: 'Group by and aggregate',
        template: `SELECT
    column1,
    COUNT(*) as count,
    SUM(column2) as total,
    AVG(column3) as average
FROM table_name
GROUP BY column1
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 100;`
    },
    {
        label: 'SELECT - Subquery',
        description: 'Query with subquery',
        template: `SELECT *
FROM table_name
WHERE column_id IN (
    SELECT id
    FROM other_table
    WHERE condition
)
LIMIT 100;`
    },
    {
        label: 'CREATE TABLE',
        description: 'Create a new table',
        template: `CREATE TABLE table_name (
    id INT PRIMARY KEY AUTO_INCREMENT,
    column1 VARCHAR(255) NOT NULL,
    column2 TEXT,
    column3 INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_column1 (column1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
        label: 'ALTER TABLE - Add Column',
        description: 'Add a new column to existing table',
        template: `ALTER TABLE table_name
ADD COLUMN new_column VARCHAR(255) NULL AFTER existing_column;`
    },
    {
        label: 'ALTER TABLE - Add Index',
        description: 'Add index to existing table',
        template: `ALTER TABLE table_name
ADD INDEX idx_column_name (column_name);`
    },
    {
        label: 'SELECT - EXISTS Check',
        description: 'Check if related records exist',
        template: `SELECT *
FROM table1 t1
WHERE EXISTS (
    SELECT 1
    FROM table2 t2
    WHERE t2.table1_id = t1.id
    AND t2.condition
)
LIMIT 100;`
    },
    {
        label: 'SELECT - UNION',
        description: 'Combine results from multiple queries',
        template: `SELECT column1, column2
FROM table1
WHERE condition1

UNION ALL

SELECT column1, column2
FROM table2
WHERE condition2

ORDER BY column1
LIMIT 100;`
    },
    {
        label: 'SELECT - Window Function',
        description: 'Use window functions for analytics',
        template: `SELECT
    column1,
    column2,
    ROW_NUMBER() OVER (PARTITION BY column1 ORDER BY column2 DESC) as row_num,
    RANK() OVER (PARTITION BY column1 ORDER BY column2 DESC) as rank
FROM table_name
WHERE condition;`
    },
    {
        label: 'SELECT - CTE (Common Table Expression)',
        description: 'Use WITH clause for readable queries',
        template: `WITH temp_result AS (
    SELECT
        column1,
        COUNT(*) as count
    FROM table_name
    WHERE condition
    GROUP BY column1
)
SELECT *
FROM temp_result
WHERE count > 10
ORDER BY count DESC;`
    }
];

export async function queryTemplatesCommand(): Promise<void> {
    // Show quick pick with templates
    const selected = await vscode.window.showQuickPick(
        templates.map(t => ({
            label: t.label,
            description: t.description,
            template: t.template
        })),
        {
            placeHolder: 'Select a query template',
            matchOnDescription: true
        }
    );

    if (!selected) {
        return;
    }

    // Create a new untitled document with the template
    const doc = await vscode.workspace.openTextDocument({
        content: selected.template,
        language: 'sql'
    });

    await vscode.window.showTextDocument(doc);
}
