import type * as vscode from 'vscode';

import type { Action } from './action/actionTypes';
import type { Mode } from './modesTypes';

/**
 * Vimの状態 (mutableに変更される)
 */
export type VimState = {
    typeSubscriptions: vscode.Disposable[];
    statusBarItem: vscode.StatusBarItem;

    mode: Mode;
    keysPressed: string[];
    actions: Action[];
    register: {
        contents: Array<RegisterContent>;
    };

    lastFt:
        | {
              character: string;
              distance: 'nearer' | 'further';
              direction: 'before' | 'after';
          }
        | undefined;
};

export type RegisterContent = {
    text: string;
    isLinewise: boolean;
};

export function saveCurrentSelectionsToRegister(
    vimState: VimState,
    editor: vscode.TextEditor,
    opts: { isLinewise: boolean },
): Array<RegisterContent> {
    const old = vimState.register.contents;
    if (editor.selections.every((sel) => sel.isEmpty)) return old;

    vimState.register.contents = editor.selections.map((selection) => {
        return {
            text: editor.document.getText(selection),
            isLinewise: opts.isLinewise,
        };
    });

    return old;
}
