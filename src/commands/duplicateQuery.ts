import * as vscode from 'vscode';
import * as path from 'path';

export async function duplicateQueryCommand(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const currentUri = editor.document.uri;

    // Check if it's a .dwquery file
    if (!currentUri.fsPath.endsWith('.dwquery')) {
        vscode.window.showErrorMessage('This command only works with .dwquery files');
        return;
    }

    // Get the current file name and directory
    const currentPath = currentUri.fsPath;
    const dir = path.dirname(currentPath);
    const ext = path.extname(currentPath);
    const baseName = path.basename(currentPath, ext);

    // Find a unique name
    let counter = 1;
    let newUri: vscode.Uri;
    let newName: string;

    do {
        newName = `${baseName}_copy${counter > 1 ? counter : ''}${ext}`;
        newUri = vscode.Uri.file(path.join(dir, newName));
        counter++;
    } while (await fileExists(newUri));

    try {
        // Get the content of the current file
        const content = editor.document.getText();

        // Write to new file using VSCode API
        await vscode.workspace.fs.writeFile(newUri, Buffer.from(content, 'utf8'));

        // Open the new file
        const newDoc = await vscode.workspace.openTextDocument(newUri);
        await vscode.window.showTextDocument(newDoc, {
            viewColumn: vscode.ViewColumn.Active,
            preview: false
        });

        vscode.window.showInformationMessage(`Query duplicated as ${newName}`);
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to duplicate query: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}
