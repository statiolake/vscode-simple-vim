import * as vscode from 'vscode';
import { Selection } from 'vscode';
import { enterMode } from './modes';

import type { VimState } from './vimState';

export async function escapeHandler(vimState: VimState): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) return;

    switch (vimState.mode) {
        case 'insert':
            await enterMode(vimState, editor, 'normal');
            break;
        case 'normal':
            if (editor.selections.length > 1) {
                editor.selections = [editor.selection];
            }
            break;
        case 'visual': {
            const newSelections = editor.selections.map((selection) => {
                return new Selection(selection.active, selection.active);
            });
            editor.selections = newSelections;
            await enterMode(vimState, editor, 'normal');
            break;
        }
        case 'visualLine': {
            const newSelections = editor.selections.map((selection) => {
                return new Selection(selection.active, selection.active);
            });
            editor.selections = newSelections;
            await enterMode(vimState, editor, 'normal');
            break;
        }
    }

    vimState.keysPressed = [];
}
