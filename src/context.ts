import type * as vscode from 'vscode';
import type { VimState } from './vimStateTypes';

/**
 * すべての操作で共通のコンテキスト
 * Motion, TextObject, Actionすべてで使用される
 */
export type Context = {
    readonly editor: vscode.TextEditor;
    readonly document: vscode.TextDocument;
    readonly vimState: VimState;
};
