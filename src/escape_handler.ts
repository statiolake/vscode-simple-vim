import * as vscode from 'vscode';
import { enterNormalMode, setModeCursorStyle } from './modes';
import { Mode } from './modesTypes';
import { typeHandler } from './actionSystem/typeHandler';
import { addTypeSubscription } from './type_subscription';
import type { VimState } from './vimStateTypes';
// VS Codeネイティブカーソル動作を常に使用

export function escapeHandler(vimState: VimState): void {
    const editor = vscode.window.activeTextEditor;

    if (!editor) return;

    if (vimState.mode === Mode.Insert) {
        // VS Codeネイティブ：Insert mode終了時はカーソル位置を保持
        enterNormalMode(vimState);
        setModeCursorStyle(vimState.mode, editor);
        addTypeSubscription(vimState, typeHandler);
    } else if (vimState.mode === Mode.Normal) {
        // Clear multiple cursors
        if (editor.selections.length > 1) {
            editor.selections = [editor.selections[0]];
        }
    } else if (vimState.mode === Mode.Visual) {
        // VS Codeネイティブ：Visual mode終了時はカーソル位置を保持
        editor.selections = editor.selections.map((selection) => {
            return new vscode.Selection(selection.active, selection.active);
        });

        enterNormalMode(vimState);
        setModeCursorStyle(vimState.mode, editor);
    } else if (vimState.mode === Mode.VisualLine) {
        // VS Codeネイティブ：VisualLine mode終了時はカーソル位置を保持
        editor.selections = editor.selections.map((selection) => {
            return new vscode.Selection(selection.active, selection.active);
        });

        enterNormalMode(vimState);
        setModeCursorStyle(vimState.mode, editor);
    }

    vimState.keysPressed = [];
}
