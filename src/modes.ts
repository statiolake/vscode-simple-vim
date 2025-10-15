import * as vscode from 'vscode';

import { Mode } from './modesTypes';
import type { VimState } from './vimStateTypes';
// VS Codeネイティブカーソル動作を常に使用

export function enterInsertMode(vimState: VimState, editor: vscode.TextEditor | undefined): void {
    vimState.mode = Mode.Insert;
    setModeContext('insert');
    setModeCursorStyle(Mode.Insert, editor);
    updateStatusBarFromExtension(Mode.Insert);
}

export function enterNormalMode(vimState: VimState, editor: vscode.TextEditor | undefined): void {
    vimState.mode = Mode.Normal;
    setModeContext('normal');
    setModeCursorStyle(Mode.Normal, editor);
    updateStatusBarFromExtension(Mode.Normal);
}

export function enterVisualMode(vimState: VimState, editor: vscode.TextEditor | undefined): void {
    vimState.mode = Mode.Visual;
    setModeContext('visual');
    setModeCursorStyle(Mode.Visual, editor);
    updateStatusBarFromExtension(Mode.Visual);
}

export function enterVisualLineMode(vimState: VimState, editor: vscode.TextEditor | undefined): void {
    vimState.mode = Mode.VisualLine;
    setModeContext('visualLine');
    setModeCursorStyle(Mode.VisualLine, editor);
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

export function setModeCursorStyle(mode: Mode, editor: vscode.TextEditor | undefined): void {
    if (!editor) return;

    if (mode === Mode.Insert) {
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.Line;
    } else if (mode === Mode.Normal) {
        // VS Codeネイティブ：常にLineカーソルを使用
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.Underline;
    } else if (mode === Mode.Visual || mode === Mode.VisualLine) {
        editor.options.cursorStyle = vscode.TextEditorCursorStyle.LineThin;
    }
}
