import type * as vscode from 'vscode';

export function updateSelections(editor: vscode.TextEditor, newSelections: vscode.Selection[]) {
    editor.selections = newSelections;
}
