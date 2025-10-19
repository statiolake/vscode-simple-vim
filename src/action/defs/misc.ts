import * as vscode from 'vscode';
import { enterMode } from '../../modes';
import { newAction } from '../actionBuilder';
import type { Action } from '../actionTypes';

/**
 * その他の基本アクション
 */
export function buildMiscActions(): Action[] {
    return [
        // u - アンドゥ
        newAction({
            keys: ['u'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                await vscode.commands.executeCommand('undo');
                enterMode(context.vimState, context.editor, 'normal');
            },
        }),
    ];
}
