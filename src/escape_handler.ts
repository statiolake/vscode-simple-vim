import * as vscode from 'vscode';
import { isVscodeNativeCursor } from './config';
import { enterNormalMode, setModeCursorStyle } from './modes';
import { Mode } from './modes_types';
import * as positionUtils from './position_utils';
import { typeHandler } from './type_handler';
import { addTypeSubscription } from './type_subscription';
import type { VimState } from './vim_state_types';

export function escapeHandler(vimState: VimState): void {
    const editor = vscode.window.activeTextEditor;

    if (!editor) return;

    if (vimState.mode === Mode.Insert) {
        // In vscode-native mode, keep cursor position when exiting insert mode
        // In vim-traditional mode, move cursor left (from vertical bar to block position)
        if (!isVscodeNativeCursor()) {
            editor.selections = editor.selections.map((selection) => {
                const newPosition = positionUtils.left(selection.active);
                return new vscode.Selection(newPosition, newPosition);
            });
        }

        enterNormalMode(vimState);
        setModeCursorStyle(vimState.mode, editor);
        addTypeSubscription(vimState, typeHandler);
    } else if (vimState.mode === Mode.Normal) {
        // Clear multiple cursors
        if (editor.selections.length > 1) {
            editor.selections = [editor.selections[0]];
        }
    } else if (vimState.mode === Mode.Visual) {
        // In vscode-native mode, keep cursor position when exiting visual mode
        // In vim-traditional mode, move cursor left
        if (isVscodeNativeCursor()) {
            editor.selections = editor.selections.map((selection) => {
                return new vscode.Selection(selection.active, selection.active);
            });
        } else {
            editor.selections = editor.selections.map((selection) => {
                const newPosition = new vscode.Position(
                    selection.active.line,
                    Math.max(selection.active.character - 1, 0),
                );
                return new vscode.Selection(newPosition, newPosition);
            });
        }

        enterNormalMode(vimState);
        setModeCursorStyle(vimState.mode, editor);
    } else if (vimState.mode === Mode.VisualLine) {
        // In vscode-native mode, keep cursor position when exiting visual line mode
        // In vim-traditional mode, move cursor left
        if (isVscodeNativeCursor()) {
            editor.selections = editor.selections.map((selection) => {
                return new vscode.Selection(selection.active, selection.active);
            });
        } else {
            editor.selections = editor.selections.map((selection) => {
                const newPosition = selection.active.with({
                    character: Math.max(selection.active.character - 1, 0),
                });
                return new vscode.Selection(newPosition, newPosition);
            });
        }

        enterNormalMode(vimState);
        setModeCursorStyle(vimState.mode, editor);
    }

    vimState.keysPressed = [];
}
