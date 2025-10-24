import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';

export async function newQueryCommand(context: vscode.ExtensionContext): Promise<void> {
    // Use global storage path (user's home directory)
    const queriesPath = path.join(context.globalStorageUri.fsPath, 'queries');

    // Create .datawarden/queries directory if it doesn't exist
    const queriesUri = vscode.Uri.file(queriesPath);
    try {
        await vscode.workspace.fs.createDirectory(queriesUri);
    } catch (error) {
        // Directory might already exist, that's ok
    }

    // Ask for query name
    const queryName = await vscode.window.showInputBox({
        prompt: 'Enter a name for your query',
        placeHolder: 'e.g., get-active-users',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Query name is required';
            }
            // Check for invalid characters
            if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                return 'Query name can only contain letters, numbers, hyphens, and underscores';
            }
            return null;
        }
    });

    if (!queryName) {
        return;
    }

    // Create query file
    const fileName = `${queryName}.dwquery`;
    const fileUri = vscode.Uri.file(path.join(queriesPath, fileName));

    // Template content
    const template = `-- @name: ${queryName}
-- @description:
-- @tags:

SELECT * FROM table_name LIMIT 10;
`;

    try {
        // Check if file exists
        try {
            await vscode.workspace.fs.stat(fileUri);
            const overwrite = await vscode.window.showWarningMessage(
                `A query named "${queryName}" already exists. Overwrite?`,
                'Overwrite',
                'Cancel'
            );
            if (overwrite !== 'Overwrite') {
                return;
            }
        } catch {
            // File doesn't exist, that's good
        }

        // Write file
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(template, 'utf8'));

        // Open file
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);

        vscode.window.showInformationMessage(`Query "${queryName}" created successfully!`);

    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to create query: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}
