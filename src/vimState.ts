import type { Disposable, StatusBarItem, TextEditor } from 'vscode';
import type { Action } from './action/actionTypes';
import type { Mode } from './modesTypes';

/**
 * Vimの状態 (mutableに変更される)
 */
export type VimState = {
    typeSubscriptions: Disposable[];
    statusBarItem: StatusBarItem;

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
    editor: TextEditor,
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
