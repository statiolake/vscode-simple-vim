import * as vscode from 'vscode';
import type { Mode } from './modesTypes';
import { typeHandler } from './typeHandler';
import { expandSelectionsToFullLines } from './utils/visualLine';
import type { VimState } from './vimState';

export function enterMode(vimState: VimState, editor: vscode.TextEditor | undefined, mode: Mode): void {
    if (vimState.mode === mode) return;

    vimState.mode = mode;
    updateModeContext(mode);
    updateCursorStyle(editor, mode);
    updateStatusBar(vimState, mode);
    updateTypeHandler(vimState, mode);

    if (mode === 'normal' && editor) {
        // ノーマルモードに入ったら、選択範囲を解除する
        editor.selections = editor.selections.map(
            (selection) => new vscode.Selection(selection.active, selection.active),
        );
    }

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
    if (mode === 'insert' && vimState.typeSubscriptions.length > 0) {
        for (const sub of vimState.typeSubscriptions) sub.dispose();
        vimState.typeSubscriptions = [];
    } else if (vimState.typeSubscriptions.length === 0) {
        vimState.typeSubscriptions = [];
        vimState.typeSubscriptions.push(
            vscode.commands.registerCommand('type', (e) => {
                typeHandler(vimState, e.text);
            }),
            vscode.commands.registerCommand('compositionStart', (_) => {
                // composition 関連のイベントはすべて無視する
            }),
            vscode.commands.registerCommand('compositionEnd', (_) => {
                // composition 関連のイベントはすべて無視する
            }),
            vscode.commands.registerCommand('replacePreviousChar', (_) => {
                // composition 関連のイベントはすべて無視する
            }),
        );
    }
}
