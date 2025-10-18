import { Position, type TextDocument } from 'vscode';

export function findNextChar(document: TextDocument, position: Position): Position {
    return document.lineAt(position.line).range.end === position
        ? new Position(position.line + 1, 0)
        : position.translate(0, 1);
}

export function findLineStartAfterIndent(document: TextDocument, position: Position): Position {
    const line = document.lineAt(position.line);
    const firstNonWhitespaceCharacterIndex = line.firstNonWhitespaceCharacterIndex;
    return new Position(position.line, firstNonWhitespaceCharacterIndex);
}

export function findLineEnd(document: TextDocument, position: Position): Position {
    const line = document.lineAt(position.line);
    return line.range.end;
}
