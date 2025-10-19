import { Position, Selection, type TextEditor } from 'vscode';

export function expandSelectionsToFullLines(textEditor: TextEditor) {
    textEditor.selections = textEditor.selections.map((selection) => {
        const doc = textEditor.document;

        const anchorLine = selection.anchor.line;
        const activeLine = selection.active.line;
        const anchorCharacter = anchorLine <= activeLine ? 0 : doc.lineAt(anchorLine).text.length;
        const activeCharacter = anchorLine <= activeLine ? doc.lineAt(activeLine).text.length : 0;

        return new Selection(new Position(anchorLine, anchorCharacter), new Position(activeLine, activeCharacter));
    });
}

export function expandSelectionsToNextLineStart(textEditor: TextEditor) {
    textEditor.selections = textEditor.selections.map((selection) => {
        if (selection.end.character === 0) return selection;
        const end = selection.end.translate(1, 0).with({ character: 0 });
        return new Selection(selection.start, end);
    });
}
