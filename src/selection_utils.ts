import * as vscode from 'vscode';
// VS Codeネイティブカーソル動作を常に使用

export function vscodeToVimVisualSelection(
    _document: vscode.TextDocument,
    vscodeSelection: vscode.Selection,
): vscode.Selection {
    // VS Codeネイティブ：selectionをそのまま使用
    return vscodeSelection;
}

export function vimToVscodeVisualSelection(
    _document: vscode.TextDocument,
    vimSelection: vscode.Selection,
): vscode.Selection {
    // VS Codeネイティブ：selectionをそのまま使用
    return vimSelection;
}

export function vscodeToVimVisualLineSelection(
    _document: vscode.TextDocument,
    vscodeSelection: vscode.Selection,
): vscode.Selection {
    return new vscode.Selection(
        vscodeSelection.anchor.with({ character: 0 }),
        vscodeSelection.active.with({ character: 0 }),
    );
}

export function vimToVscodeVisualLineSelection(
    document: vscode.TextDocument,
    vimSelection: vscode.Selection,
): vscode.Selection {
    const anchorLineLength = document.lineAt(vimSelection.anchor.line).text.length;
    const activeLineLength = document.lineAt(vimSelection.active.line).text.length;

    if (vimSelection.active.isBefore(vimSelection.anchor)) {
        return new vscode.Selection(
            vimSelection.anchor.with({ character: anchorLineLength }),
            vimSelection.active.with({ character: 0 }),
        );
    } else {
        return new vscode.Selection(
            vimSelection.anchor.with({ character: 0 }),
            vimSelection.active.with({ character: activeLineLength }),
        );
    }
}
