import * as vscode from 'vscode';
import { Selection } from 'vscode';
import { enterMode } from '../../modes';
import { findLineEnd, findLineStartAfterIndent } from '../../utils/positionFinder';
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

        // zu - カーソル操作を元に戻す
        newAction({
            keys: ['z', 'u'],
            modes: ['normal'],
            execute: async (_context) => {
                await vscode.commands.executeCommand('cursorUndo');
            },
        }),

        // Visual mode の I - 各選択範囲の先頭で insert モードに入る
        newAction({
            keys: ['I'],
            modes: ['visual'],
            execute: async (context) => {
                // 各選択範囲の先頭にカーソルを配置
                context.editor.selections = context.editor.selections.map(
                    (selection) => new Selection(selection.start, selection.start),
                );
                // Insert モードに入る
                await enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        // Visual mode の A - 各選択範囲の末尾で insert モードに入る
        newAction({
            keys: ['A'],
            modes: ['visual'],
            execute: async (context) => {
                // 各選択範囲の末尾にカーソルを配置
                context.editor.selections = context.editor.selections.map(
                    (selection) => new Selection(selection.end, selection.end),
                );
                // Insert モードに入る
                await enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        // Visual Line mode の I - 各行の先頭にマルチカーソルを挿入
        newAction({
            keys: ['I'],
            modes: ['visualLine'],
            execute: async (context) => {
                // Visual Line の各行の先頭にカーソルを配置
                context.editor.selections = context.editor.selections.flatMap((selection) => {
                    const startLine = Math.min(selection.anchor.line, selection.active.line);
                    const endLine = Math.max(selection.anchor.line, selection.active.line);
                    const cursors: Selection[] = [];
                    for (let line = startLine; line <= endLine; line++) {
                        const lineStart = findLineStartAfterIndent(context.document, new vscode.Position(line, 0));
                        cursors.push(new Selection(lineStart, lineStart));
                    }
                    return cursors;
                });
                // Insert モードに入る
                await enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        // Visual Line mode の A - 各行の末尾にマルチカーソルを挿入
        newAction({
            keys: ['A'],
            modes: ['visualLine'],
            execute: async (context) => {
                const doc = context.editor.document;
                // Visual Line の各行の末尾にカーソルを配置
                context.editor.selections = context.editor.selections.flatMap((selection) => {
                    const startLine = Math.min(selection.anchor.line, selection.active.line);
                    const endLine = Math.max(selection.anchor.line, selection.active.line);
                    const cursors: Selection[] = [];
                    for (let line = startLine; line <= endLine; line++) {
                        const lineEnd = findLineEnd(doc, new vscode.Position(line, 0));
                        cursors.push(new Selection(lineEnd, lineEnd));
                    }
                    return cursors;
                });
                // Insert モードに入る
                await enterMode(context.vimState, context.editor, 'insert');
            },
        }),
    ];
}
