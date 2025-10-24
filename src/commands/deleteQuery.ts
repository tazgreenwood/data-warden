import * as vscode from 'vscode';

export async function deleteQueryCommand(item: any, refresh: () => void): Promise<void> {
    if (!item || !item.uri) {
        return;
    }

    const queryName = item.label;
    const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete "${queryName}"?`,
        { modal: true },
        'Delete'
    );

    if (confirm !== 'Delete') {
        return;
    }

    try {
        await vscode.workspace.fs.delete(item.uri);
        vscode.window.showInformationMessage(`Query "${queryName}" deleted`);
        refresh();
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to delete query: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}
