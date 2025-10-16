import * as vscode from 'vscode';
import { buildActions } from './actionSystem/actions';
import { typeHandler } from './actionSystem/typeHandler';
import { escapeHandler } from './escape_handler';
import { enterMode } from './modes';
import type { VimState } from './vimStateTypes';
import { expandSelectionsToFullLines } from './visualLineUtils';

function onSelectionChange(vimState: VimState, e: vscode.TextEditorSelectionChangeEvent): void {
    const allEmpty = e.selections.every((selection) => selection.isEmpty);
    if (allEmpty && e.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
        // マウスをクリックしたことにより選択範囲が無になった場合は、ノーマルモードに戻る
        enterMode(vimState, e.textEditor, 'normal');
    } else if (vimState.mode === 'visualLine') {
        // Visual Line モードでは、選択範囲を行全体に拡張する
        expandSelectionsToFullLines(e.textEditor);
    } else if (!allEmpty) {
        // それ以外のモードで選択状態になった場合は Visual モードへ移行する
        enterMode(vimState, e.textEditor, 'visual');
    }
}

function onDidChangeActiveTextEditor(vimState: VimState, editor: vscode.TextEditor | undefined) {
    if (!editor) return;

    if (editor.selections.every((selection) => selection.isEmpty)) {
        if (vimState.mode === 'visual' || vimState.mode === 'visualLine') enterMode(vimState, editor, 'normal');
    } else {
        if (vimState.mode === 'normal') {
            enterMode(vimState, editor, 'visual');
        }
    }

    vimState.keysPressed = [];
}

function onDidChangeConfiguration(vimState: VimState, e: vscode.ConfigurationChangeEvent): void {
    if (!e.affectsConfiguration('simple-vim')) return;
    vimState.actions = buildActions();
}

export function activate(context: vscode.ExtensionContext): void {
    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => onDidChangeActiveTextEditor(vimState, editor)),
        vscode.window.onDidChangeTextEditorSelection((e) => onSelectionChange(vimState, e)),
        vscode.workspace.onDidChangeConfiguration((e) => onDidChangeConfiguration(vimState, e)),
        vscode.commands.registerCommand('simple-vim.escapeKey', () => escapeHandler(vimState)),
        vscode.commands.registerCommand('simple-vim.noop', () => {
            // Do nothing - used to ignore keys in certain modes
        }),
        vscode.commands.registerCommand('simple-vim.send', (args: { keys: string }) => {
            if (!args || !args.keys) {
                console.error('simple-vim.send: keys argument is required');
                return;
            }
            typeHandler(vimState, args.keys);
        }),
    );

    const vimState: VimState = {
        typeSubscription: undefined,
        statusBarItem,
        mode: 'insert',
        keysPressed: [],
        actions: buildActions(),
        register: {
            contents: [],
        },
        lastFtChar: '',
        lastFtCommand: undefined,
    };

    enterMode(vimState, vscode.window.activeTextEditor, 'normal');

    if (vscode.window.activeTextEditor) {
        onDidChangeActiveTextEditor(vimState, vscode.window.activeTextEditor);
    }
}
