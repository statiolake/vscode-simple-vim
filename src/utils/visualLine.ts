import * as vscode from 'vscode';

export function expandSelectionsToFullLines(textEditor: vscode.TextEditor) {
    textEditor.selections = textEditor.selections.map((selection) => {
        const doc = textEditor.document;

        const anchorLine = selection.anchor.line;
        const activeLine = selection.active.line;
        const anchorCharacter = anchorLine <= activeLine ? 0 : doc.lineAt(anchorLine).text.length;
        const activeCharacter = anchorLine <= activeLine ? doc.lineAt(activeLine).text.length : 0;

        return new vscode.Selection(
            new vscode.Position(anchorLine, anchorCharacter),
            new vscode.Position(activeLine, activeCharacter),
        );
    });
}
