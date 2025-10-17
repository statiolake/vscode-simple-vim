import * as vscode from 'vscode';
import { enterMode } from './modes';
import type { VimState } from './vimStateTypes';

export function escapeHandler(vimState: VimState): void {
    const editor = vscode.window.activeTextEditor;

    if (!editor) return;

    switch (vimState.mode) {
        case 'insert':
            enterMode(vimState, editor, 'normal');
            break;
        case 'normal':
            if (editor.selections.length > 1) editor.selections = [editor.selection];
            break;
        case 'visual':
            editor.selections = editor.selections.map((selection) => {
                return new vscode.Selection(selection.active, selection.active);
            });
            enterMode(vimState, editor, 'normal');
            break;
        case 'visualLine':
            editor.selections = editor.selections.map((selection) => {
                return new vscode.Selection(selection.active, selection.active);
            });
            enterMode(vimState, editor, 'normal');
            break;
    }

    vimState.keysPressed = [];
}
