import * as vscode from 'vscode';
import { enterMode } from './modes';
import type { VimState } from './vimStateTypes';
// VS Codeネイティブカーソル動作を常に使用

export function escapeHandler(vimState: VimState): void {
    const editor = vscode.window.activeTextEditor;

    if (!editor) return;

    if (vimState.mode === 'insert') {
        // VS Codeネイティブ：Insert mode終了時はカーソル位置を保持
        enterMode(vimState, editor, 'normal');
    } else if (vimState.mode === 'normal') {
        // Clear multiple cursors
        if (editor.selections.length > 1) {
            editor.selections = [editor.selections[0]];
        }
    } else if (vimState.mode === 'visual') {
        // VS Codeネイティブ：Visual mode終了時はカーソル位置を保持
        editor.selections = editor.selections.map((selection) => {
            return new vscode.Selection(selection.active, selection.active);
        });

        enterMode(vimState, editor, 'normal');
    } else if (vimState.mode === 'visualLine')
        // VS Codeネイティブ：VisualLine mode終了時はカーソル位置を保持
        editor.selections = editor.selections.map((selection) => {
            return new vscode.Selection(selection.active, selection.active);
        });

    enterMode(vimState, editor, 'normal');

    vimState.keysPressed = [];
}
