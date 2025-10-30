import * as vscode from 'vscode';
import { Selection } from 'vscode';
import { enterMode } from '../../modes';
import { findLineEnd, findLineStartAfterIndent } from '../../utils/positionFinder';
import { newAction } from '../actionBuilder';
import type { Action } from '../actionTypes';

/**
 * モード切り替えアクション
 */
export function buildModeActions(): Action[] {
    return [
        // i, a - Insert モードに入る
        // VS Code のネイティブなカーソル位置を前提とすると i と a は同じ動作になる
        newAction({
            keys: ['i'],
            modes: ['normal'],
            execute: async (context) => {
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['a'],
            modes: ['normal'],
            execute: async (context) => {
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        // I - 行頭（インデント後）に移動して Insert モード
        newAction({
            keys: ['I'],
            modes: ['normal'],
            execute: async (context) => {
                context.editor.selections = context.editor.selections.map((selection) => {
                    const newPosition = findLineStartAfterIndent(context.document, selection.active);
                    return new Selection(newPosition, newPosition);
                });
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        // A - 行末に移動して Insert モード
        newAction({
            keys: ['A'],
            modes: ['normal'],
            execute: async (context) => {
                context.editor.selections = context.editor.selections.map((selection) => {
                    const newPosition = findLineEnd(context.document, selection.active);
                    return new Selection(newPosition, newPosition);
                });
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        // o - 下に新しい行を挿入して Insert モード
        newAction({
            keys: ['o'],
            modes: ['normal'],
            execute: async (context) => {
                await vscode.commands.executeCommand('editor.action.insertLineAfter');
                // await new Promise((resolve) => setTimeout(resolve, 1000));
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        // O - 上に新しい行を挿入して Insert モード
        newAction({
            keys: ['O'],
            modes: ['normal'],
            execute: async (context) => {
                await vscode.commands.executeCommand('editor.action.insertLineBefore');
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        // v - Visual モードに入る
        newAction({
            keys: ['v'],
            modes: ['normal', 'visualLine'],
            execute: async (context) => {
                enterMode(context.vimState, context.editor, 'visual');
            },
        }),

        // V - Visual Line モードに入る
        newAction({
            keys: ['V'],
            modes: ['normal', 'visual'],
            execute: async (context) => {
                enterMode(context.vimState, context.editor, 'visualLine');
            },
        }),
    ];
}
