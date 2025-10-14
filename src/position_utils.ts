import * as vscode from 'vscode';
// VS Codeネイティブカーソル動作を常に使用

export function left(position: vscode.Position, count: number = 1): vscode.Position {
    return position.with({
        character: Math.max(position.character - count, 0),
    });
}

export function right(document: vscode.TextDocument, position: vscode.Position, count: number = 1): vscode.Position {
    const lineLength = document.lineAt(position.line).text.length;
    return position.with({
        character: Math.min(position.character + count, lineLength),
    });
}

export function rightNormal(
    document: vscode.TextDocument,
    position: vscode.Position,
    count: number = 1,
): vscode.Position {
    // VS Codeネイティブ：行末+1の位置まで移動可能
    return right(document, position, count);
}

export function leftWrap(document: vscode.TextDocument, position: vscode.Position): vscode.Position {
    if (position.character <= 0) {
        if (position.line <= 0) {
            return position;
        } else {
            const previousLineLength = document.lineAt(position.line - 1).text.length;
            return new vscode.Position(position.line - 1, previousLineLength);
        }
    } else {
        return position.with({ character: position.character - 1 });
    }
}

export function rightWrap(document: vscode.TextDocument, position: vscode.Position): vscode.Position {
    const lineLength = document.lineAt(position.line).text.length;

    if (position.character >= lineLength) {
        if (position.line >= document.lineCount - 1) {
            return position;
        } else {
            return new vscode.Position(position.line + 1, 0);
        }
    } else {
        return position.with({ character: position.character + 1 });
    }
}

export function lineEnd(document: vscode.TextDocument, position: vscode.Position): vscode.Position {
    const lineLength = document.lineAt(position.line).text.length;
    return position.with({
        character: lineLength,
    });
}
