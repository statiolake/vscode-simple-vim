import * as vscode from 'vscode';

import { buildActions } from './action/actions';
import { escapeHandler } from './escapeHandler';
import { enterMode } from './modes';
import { typeHandler } from './typeHandler';
import { CommentConfigProvider } from './utils/comment';
import { expandSelectionsToFullLines } from './utils/visualLine';
import type { VimState } from './vimState';

// グローバルな CommentConfigProvider（起動時に一度だけ初期化）
export let globalCommentConfigProvider: CommentConfigProvider;

function onSelectionChange(vimState: VimState, e: vscode.TextEditorSelectionChangeEvent): void {
    const allEmpty = e.selections.every((selection) => selection.isEmpty);
    if (allEmpty && vimState.mode !== 'insert') {
        // 選択範囲が無になった場合は、ノーマルモードに戻る。この条件だと
        // Visualモードにいて移動したあと逆方向に動かして選択範囲が無になった
        // ときもノーマルモードに戻るが、まあ良しとするというのは、VS Code が
        // undoなどの組み込みコマンドが一時的に非空の選択範囲を作成することが
        // あり、最終的には空になるものの、そこでノーマルモードに戻れるように
        // しなければならないから。しかし、それらもあくまでも「コマンドによる
        // 選択範囲変更」であり、このハンドラ内ではvlh のケースと区別がつかな
        // い。 vlh などは比較的登場頻度が低いことを考えると、これでいいんじゃ
        // ないか。
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
    // Create comment config provider
    globalCommentConfigProvider = new CommentConfigProvider();

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    const vimState: VimState = {
        typeSubscriptions: [],
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

    enterMode(vimState, vscode.window.activeTextEditor, 'normal');

    if (vscode.window.activeTextEditor) {
        onDidChangeActiveTextEditor(vimState, vscode.window.activeTextEditor);
    }
}
