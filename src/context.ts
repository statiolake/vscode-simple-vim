import type * as vscode from 'vscode';

import type { CommentConfigProvider } from './utils/comment';
import type { VimState } from './vimState';

/**
 * すべての操作で共通のコンテキスト
 * Motion, TextObject, Actionすべてで使用される
 */
export type Context = {
    readonly editor: vscode.TextEditor;
    readonly document: vscode.TextDocument;
    readonly vimState: VimState;
    readonly commentConfigProvider: CommentConfigProvider;
};
