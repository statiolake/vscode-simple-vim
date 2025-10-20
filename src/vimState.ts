import type { Disposable, StatusBarItem } from 'vscode';
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
        lastClipboardText: string;
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
