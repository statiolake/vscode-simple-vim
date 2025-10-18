import * as vscode from 'vscode';

import type { Context } from './context';
import { globalCommentConfigProvider } from './extension';
import type { VimState } from './vimState';

export function typeHandler(vimState: VimState, char: string): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    // In other modes, add to pressed keys and try to execute actions
    vimState.keysPressed.push(char);

    const context: Context = {
        editor,
        document: editor.document,
        vimState,
        commentConfigProvider: globalCommentConfigProvider,
    };

    // Try to execute an action
    let executed = false;
    let needsMore = false;

    for (const action of vimState.actions) {
        const result = action(context, vimState.keysPressed);

        if (result === 'executed') {
            executed = true;
            console.log('Action executed for keys:', vimState.keysPressed);
            break;
        } else if (result === 'needsMoreKey') {
            needsMore = true;
        }
    }

    // Debug logging
    if (!executed && !needsMore) {
        console.log('No action matched for keys:', vimState.keysPressed);
    } else if (!executed && needsMore) {
        console.log('Action needs more keys:', vimState.keysPressed);
    }

    if (executed) {
        // If an action was executed, clear the keys
        vimState.keysPressed = [];
        console.log('cleared due to execution');
    } else if (!needsMore) {
        // No action matched and no action needs more input, clear the keys
        vimState.keysPressed = [];
        console.log('cleared due to no match');
    }
}
