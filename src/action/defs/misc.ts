import * as vscode from 'vscode';
import { newAction } from '../actionBuilder';
import type { Action } from '../actionTypes';

/**
 * その他の基本アクション
 */
export function buildMiscActions(): Action[] {
    return [
        // gj - 画面上一つ下の行へ移動（折り返し行を考慮）
        newAction({
            keys: ['g', 'j'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                // Visual mode の場合は選択を維持する
                const isVisualMode = context.vimState.mode === 'visual' || context.vimState.mode === 'visualLine';

                // VS Code の cursorMove コマンドを使用してディスプレイライン単位で移動
                await vscode.commands.executeCommand('cursorMove', {
                    to: 'down',
                    by: 'wrappedLine',
                    value: 1,
                    select: isVisualMode,
                });
            },
        }),

        // gk - 画面上一つ上の行へ移動（折り返し行を考慮）
        newAction({
            keys: ['g', 'k'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                // Visual mode の場合は選択を維持する
                const isVisualMode = context.vimState.mode === 'visual' || context.vimState.mode === 'visualLine';

                // VS Code の cursorMove コマンドを使用してディスプレイライン単位で移動
                await vscode.commands.executeCommand('cursorMove', {
                    to: 'up',
                    by: 'wrappedLine',
                    value: 1,
                    select: isVisualMode,
                });
            },
        }),
    ];
}
