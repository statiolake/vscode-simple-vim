import * as vscode from 'vscode';

import { isVscodeNativeCursor } from './config';
import { Mode } from './modes_types';
import type { VimState } from './vim_state_types';

export function enterInsertMode(vimState: VimState): void {
    vimState.mode = Mode.Insert;
    setModeContext('insert');
    updateStatusBarFromExtension(Mode.Insert);
}

export function enterNormalMode(vimState: VimState): void {
    vimState.mode = Mode.Normal;
    setModeContext('normal');
    updateStatusBarFromExtension(Mode.Normal);
}

export function enterVisualMode(vimState: VimState): void {
    vimState.mode = Mode.Visual;
    setModeContext('visual');
    updateStatusBarFromExtension(Mode.Visual);
}

export function enterVisualLineMode(vimState: VimState): void {
    vimState.mode = Mode.VisualLine;
    setModeContext('visualLine');
    updateStatusBarFromExtension(Mode.VisualLine);
}

function updateStatusBarFromExtension(mode: Mode): void {
    // Import dynamically to avoid circular dependency
    import('./extension').then((ext) => {
        ext.updateStatusBar(mode);
    });
}

function setModeContext(mode: 'insert' | 'normal' | 'visual' | 'visualLine') {
    vscode.commands.executeCommand('setContext', 'simple-vim.mode', mode);
}

export function setModeCursorStyle(mode: Mode, editor: vscode.TextEditor): void {
    if (mode === Mode.Insert) {
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.Line;
    } else if (mode === Mode.Normal) {
        if (isVscodeNativeCursor()) {
            editor.options.cursorStyle = vscode.TextEditorCursorStyle.Line;
        } else {
            editor.options.cursorStyle = vscode.TextEditorCursorStyle.Block;
        }
    } else if (mode === Mode.Visual || mode === Mode.VisualLine) {
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.LineThin;
    }
}
