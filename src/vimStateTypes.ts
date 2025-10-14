import type * as vscode from 'vscode';
import type { Mode } from './modesTypes';
import type { Action } from './actionSystem/actionTypes';

/**
 * Vimの状態 (mutableに変更される)
 */
export type VimState = {
    mode: Mode;
    typeSubscription: vscode.Disposable | undefined;
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
