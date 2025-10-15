import * as vscode from 'vscode';
import { typeHandler } from './actionSystem/typeHandler';
import type { Mode } from './modesTypes';
import type { VimState } from './vimStateTypes';

export function enterMode(vimState: VimState, editor: vscode.TextEditor | undefined, mode: Mode): void {
    vimState.mode = mode;
    setModeContext(mode);
    setModeCursorStyle(editor, mode);
    updateStatusBar(vimState, mode);
    updateTypeHandler(vimState, mode);
}

function setModeContext(mode: Mode) {
    vscode.commands.executeCommand('setContext', 'simple-vim.mode', mode);
}

function setModeCursorStyle(editor: vscode.TextEditor | undefined, mode: Mode): void {
    if (!editor) return;

    if (mode === 'insert') {
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.Line;
    } else if (mode === 'normal') {
        // VS Codeネイティブ：常にLineカーソルを使用
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.Underline;
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
