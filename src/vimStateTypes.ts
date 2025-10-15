import type * as vscode from 'vscode';
import type { Action } from './actionSystem/actionTypes';
import type { Mode } from './modesTypes';

/**
 * Vimの状態 (mutableに変更される)
 */
export type VimState = {
    typeSubscription: vscode.Disposable | undefined;
    statusBarItem: vscode.StatusBarItem;

    mode: Mode;
    keysPressed: string[];
    actions: Action[];
    registers: {
        contentsList: (string | undefined)[];
        linewise: boolean;
    };
    lastPutRanges: {
        ranges: (vscode.Range | undefined)[];
        linewise: boolean;
    };
    lastFtChar: string; // f/F/t/T で検索した文字を保持
};
