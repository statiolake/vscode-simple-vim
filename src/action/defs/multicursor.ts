import * as vscode from 'vscode';
import { Selection } from 'vscode';
import { enterMode } from '../../modes';
import { updateSelections } from '../../utils/cursor';
import { newAction } from '../actionBuilder';
import type { Action } from '../actionTypes';

/**
 * マルチカーソル操作アクション
 * VS Code のネイティブマルチカーソル機能を使用
 */
export function buildMulticursorActions(): Action[] {
    return [
        // zn - 次のマッチにカーソルを追加
        newAction({
            keys: ['z', 'n'],
            modes: ['normal', 'visual'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.addSelectionToNextFindMatch');
            },
        }),

        // zs - 次のマッチをスキップ
        newAction({
            keys: ['z', 's'],
            modes: ['normal', 'visual'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.moveSelectionToNextFindMatch');
            },
        }),

        // zN - 前のマッチにカーソルを追加
        newAction({
            keys: ['z', 'N'],
            modes: ['normal', 'visual'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.addSelectionToPreviousFindMatch');
            },
        }),

        // zS - 前のマッチをスキップ
        newAction({
            keys: ['z', 'S'],
            modes: ['normal', 'visual'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.moveSelectionToPreviousFindMatch');
            },
        }),

        // zA - すべてのマッチにカーソルを追加
        newAction({
            keys: ['z', 'A'],
            modes: ['normal', 'visual'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('editor.action.selectHighlights');
            },
        }),

        // zx - セカンダリカーソルを削除
        newAction({
            keys: ['z', 'x'],
            modes: ['normal', 'visual'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('removeSecondaryCursors');
            },
        }),

        // zgv - カーソル操作を元に戻す
        newAction({
            keys: ['z', 'g', 'v'],
            modes: ['normal'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('cursorUndo');
            },
        }),

        // Visual mode の I - 各選択範囲の先頭で insert モードに入る
        newAction({
            keys: ['I'],
            modes: ['visual', 'visualLine'],
            execute: async (_context) => {
                // 各選択範囲の先頭にカーソルを配置
                const newSelections = _context.editor.selections.map(
                    (selection) => new Selection(selection.start, selection.start),
                );
                updateSelections(_context.editor, newSelections);
                // Insert モードに入る
                await enterMode(_context.vimState, _context.editor, 'insert');
            },
        }),

        // Visual mode の A - 各選択範囲の末尾で insert モードに入る
        newAction({
            keys: ['A'],
            modes: ['visual', 'visualLine'],
            execute: async (_context) => {
                // 各選択範囲の末尾にカーソルを配置
                const newSelections = _context.editor.selections.map(
                    (selection) => new Selection(selection.end, selection.end),
                );
                updateSelections(_context.editor, newSelections);
                // Insert モードに入る
                await enterMode(_context.vimState, _context.editor, 'insert');
            },
        }),
    ];
}
