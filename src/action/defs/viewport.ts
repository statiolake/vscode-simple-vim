import * as vscode from 'vscode';
import { newAction } from '../actionBuilder';
import type { Action } from '../actionTypes';

/**
 * ビューポート制御アクション
 */
export function buildViewportActions(): Action[] {
    return [
        // zz - カーソル行を画面中央に
        newAction({
            keys: ['z', 'z'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;
                if (!editor) return;

                const selection = editor.selection;
                await vscode.commands.executeCommand('revealLine', {
                    lineNumber: selection.active.line,
                    at: 'center',
                });
            },
        }),

        // zt - カーソル行を画面上部に
        newAction({
            keys: ['z', 't'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;
                if (!editor) return;

                const selection = editor.selection;
                await vscode.commands.executeCommand('revealLine', {
                    lineNumber: selection.active.line,
                    at: 'top',
                });
            },
        }),

        // zb - カーソル行を画面下部に
        newAction({
            keys: ['z', 'b'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;
                if (!editor) return;

                const selection = editor.selection;
                await vscode.commands.executeCommand('revealLine', {
                    lineNumber: selection.active.line,
                    at: 'bottom',
                });
            },
        }),
    ];
}
