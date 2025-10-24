import * as vscode from 'vscode';

export async function formatSqlCommand(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    // Check if it's a SQL-related file
    const languageId = editor.document.languageId;
    if (languageId !== 'sql' && languageId !== 'dwquery' && !editor.document.fileName.endsWith('.dwquery')) {
        vscode.window.showErrorMessage('This command only works with SQL files');
        return;
    }

    try {
        // Use VSCode's built-in format document command
        // This will use whatever SQL formatter extension the user has installed
        await vscode.commands.executeCommand('editor.action.formatDocument');
    } catch (error) {
        // If no formatter is available, show a helpful message
        const message = 'No SQL formatter extension installed. Would you like to install one?';
        const install = await vscode.window.showInformationMessage(
            message,
            'Install SQL Formatter',
            'Learn More',
            'Cancel'
        );

        if (install === 'Install SQL Formatter') {
            // Open the marketplace to SQL formatter extensions
            vscode.commands.executeCommand(
                'workbench.extensions.search',
                'sql formatter'
            );
        } else if (install === 'Learn More') {
            // Open documentation or a help page
            vscode.env.openExternal(
                vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=ReneSaarsoo.sql-formatter-vsc')
            );
        }
    }
}
