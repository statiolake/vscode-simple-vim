import type * as vscode from 'vscode';

/**
 * すべての操作で共通のコンテキスト
 * Motion, TextObject, Actionすべてで使用される
 */
export type Context = {
    readonly editor: vscode.TextEditor;
    readonly document: vscode.TextDocument;
};
