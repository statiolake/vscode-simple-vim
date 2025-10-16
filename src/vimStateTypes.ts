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
    register: {
        contents: Array<RegisterContent | undefined>;
    };
    // f/F/t/T の繰り返し用
    lastFtChar: string; // 最後に検索した文字
    lastFtCommand: 'f' | 'F' | 't' | 'T' | undefined; // 最後に使ったコマンド
};

export type RegisterContent = {
    text: string;
    isLinewise: boolean;
};
