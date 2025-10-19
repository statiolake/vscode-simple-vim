import type { Selection, TextEditor } from 'vscode';

export function updateSelections(editor: TextEditor, newSelections: Selection[]) {
    editor.selections = newSelections;
}
