import * as vscode from 'vscode';
import { typeHandler } from './actionSystem/typeHandler';
import type { Mode } from './modesTypes';
import type { VimState } from './vimStateTypes';
import { expandSelectionsToFullLines } from './visualLineUtils';

export function enterMode(vimState: VimState, editor: vscode.TextEditor | undefined, mode: Mode): void {
    vimState.mode = mode;
    updateModeContext(mode);
    updateCursorStyle(editor, mode);
    updateStatusBar(vimState, mode);
    updateTypeHandler(vimState, mode);

    if (mode === 'visualLine' && editor) {
        // Visual Line モードに入ったら、選択範囲を行全体に拡張する
        expandSelectionsToFullLines(editor);
    }
}

function updateModeContext(mode: Mode) {
    vscode.commands.executeCommand('setContext', 'simple-vim.mode', mode);
}

function updateCursorStyle(editor: vscode.TextEditor | undefined, mode: Mode): void {
    if (!editor) return;

    if (mode === 'insert') {
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.LineThin;
    } else if (mode === 'normal') {
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.Line;
    } else if (mode === 'visual' || mode === 'visualLine') {
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.LineThin;
    }
}

function updateStatusBar(vimState: VimState, mode: Mode): void {
    const { statusBarItem } = vimState;
    if (!statusBarItem) return;

    switch (mode) {
        case 'normal':
            statusBarItem.text = '-- NORMAL --';
            break;
        case 'insert':
            statusBarItem.text = '-- INSERT --';
            break;
        case 'visual':
            statusBarItem.text = '-- VISUAL --';
            break;
        case 'visualLine':
            statusBarItem.text = '-- VISUAL LINE --';
            break;
    }

    statusBarItem.show();
}

function updateTypeHandler(vimState: VimState, mode: Mode): void {
    if (mode === 'insert' && vimState.typeSubscription) {
        vimState.typeSubscription.dispose();
        vimState.typeSubscription = undefined;
    } else if (!vimState.typeSubscription) {
        vimState.typeSubscription = vscode.commands.registerCommand('type', (e) => {
            typeHandler(vimState, e.text);
        });
    }
}
