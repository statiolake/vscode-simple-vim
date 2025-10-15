import * as vscode from 'vscode';

export function expandSelectionsToFullLines(textEditor: vscode.TextEditor) {
    textEditor.selections = textEditor.selections.map((selection) => {
        const doc = textEditor.document;
        if (
            (selection.anchor.character === 0 && selection.active.character === 0) ||
            (selection.anchor.character === doc.lineAt(selection.anchor).text.length &&
                selection.active.character === doc.lineAt(selection.active).text.length)
        ) {
            // すでに行全体が選択されている場合は、そのまま返す
            return selection;
        }

        const anchorLine = selection.anchor.line;
        let activeLine = selection.active.line;
        let anchorCharacter = selection.anchor.character;
        let activeCharacter = selection.active.character;
        if (anchorLine <= activeLine) {
            anchorCharacter = 0;
            if (activeLine + 1 <= doc.lineCount) {
                activeLine++;
                activeCharacter = 0;
            } else {
                activeCharacter = doc.lineAt(activeLine).text.length;
            }
        } else {
            anchorCharacter = doc.lineAt(anchorLine).text.length;
            if (activeLine - 1 >= 0) {
                activeLine--;
                activeCharacter = doc.lineAt(activeLine).text.length;
            } else {
                activeCharacter = 0;
            }
        }

        return new vscode.Selection(
            new vscode.Position(anchorLine, anchorCharacter),
            new vscode.Position(activeLine, activeCharacter),
        );
    });
}
