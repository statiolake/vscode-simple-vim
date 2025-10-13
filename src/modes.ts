import * as vscode from 'vscode';

import { Mode } from './modes_types';
import type { VimState } from './vim_state_types';

export function enterInsertMode(vimState: VimState): void {
    vimState.mode = Mode.Insert;
    setModeContext('insert');
}

export function enterNormalMode(vimState: VimState): void {
    vimState.mode = Mode.Normal;
    setModeContext('normal');
}

export function enterVisualMode(vimState: VimState): void {
    vimState.mode = Mode.Visual;
    setModeContext('visual');
}

export function enterVisualLineMode(vimState: VimState): void {
    vimState.mode = Mode.VisualLine;
    setModeContext('visualLine');
}

function setModeContext(mode: 'insert' | 'normal' | 'visual' | 'visualLine') {
    vscode.commands.executeCommand('setContext', 'simple-vim.mode', mode);
}

export function setModeCursorStyle(mode: Mode, editor: vscode.TextEditor): void {
    if (mode === Mode.Insert) {
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.Line;
    } else if (mode === Mode.Normal) {
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.Block;
    } else if (mode === Mode.Visual || mode === Mode.VisualLine) {
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.LineThin;
    }
}
