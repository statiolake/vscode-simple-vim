import * as vscode from 'vscode';
import { newAction } from '../actionBuilder';
import type { Action } from '../actionTypes';

/**
 * LSP（Language Server Protocol）アクション
 * VS Code の言語機能と統合するアクション
 */
export function buildLspActions(): Action[] {
    return [
        // gh - ホバー情報を表示
        newAction({
            keys: ['g', 'h'],
            modes: ['normal'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.showHover');
            },
        }),

        // gd - 定義へ移動
        newAction({
            keys: ['g', 'd'],
            modes: ['normal'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.revealDefinition');
            },
        }),

        // gD - 宣言へ移動
        newAction({
            keys: ['g', 'D'],
            modes: ['normal'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.revealDeclaration');
            },
        }),

        // gy - 型定義へ移動
        newAction({
            keys: ['g', 'y'],
            modes: ['normal'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.goToTypeDefinition');
            },
        }),

        // gI - 実装へ移動
        newAction({
            keys: ['g', 'I'],
            modes: ['normal'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.goToImplementation');
            },
        }),

        // gr - 参照へ移動
        newAction({
            keys: ['g', 'r'],
            modes: ['normal'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.goToReferences');
            },
        }),

        // gR - シンボルの名前変更
        newAction({
            keys: ['g', 'R'],
            modes: ['normal'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.rename');
            },
        }),

        // g. - コードアクション/クイックフィックスを表示
        newAction({
            keys: ['g', '.'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.quickFix');
            },
        }),

        // gf - ドキュメントをフォーマット
        newAction({
            keys: ['g', 'f'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.formatDocument');
            },
        }),

        // gp - 問題パネルを開く
        newAction({
            keys: ['g', 'p'],
            modes: ['normal'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('workbench.actions.view.problems');
            },
        }),

        // [d - 前の診断/問題へ移動
        newAction({
            keys: ['[', 'd'],
            modes: ['normal'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.marker.prevInFiles');
            },
        }),

        // ]d - 次の診断/問題へ移動
        newAction({
            keys: [']', 'd'],
            modes: ['normal'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.marker.nextInFiles');
            },
        }),
    ];
}
