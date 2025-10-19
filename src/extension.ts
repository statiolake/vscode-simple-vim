import * as vscode from 'vscode';
import {
    type ConfigurationChangeEvent,
    type ExtensionContext,
    Range,
    StatusBarAlignment,
    type TextEditor,
    type TextEditorSelectionChangeEvent,
} from 'vscode';
import { buildActions, delegateAction } from './action/actions';
import type { Context } from './context';
import { escapeHandler } from './escapeHandler';
import { enterMode } from './modes';
import { typeHandler } from './typeHandler';
import { CommentConfigProvider } from './utils/comment';
import { expandSelectionsToFullLines } from './utils/visualLine';
import type { VimState } from './vimState';

// グローバルな CommentConfigProvider（起動時に一度だけ初期化）
export let globalCommentConfigProvider: CommentConfigProvider;

async function onSelectionChange(vimState: VimState, e: TextEditorSelectionChangeEvent): Promise<void> {
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
        await enterMode(vimState, e.textEditor, 'normal');
    } else if (vimState.mode === 'visualLine') {
        // Visual Line モードでは、選択範囲を行全体に拡張する
        expandSelectionsToFullLines(e.textEditor);
    } else if (!allEmpty) {
        // それ以外のモードで選択状態になった場合は Visual モードへ移行する
        await enterMode(vimState, e.textEditor, 'visual');
    }

    // 選択範囲の先頭が表示されるようにスクロールする
    e.textEditor.revealRange(new Range(e.selections[0].active, e.selections[0].active));
}

async function onDidChangeActiveTextEditor(vimState: VimState, editor: TextEditor | undefined): Promise<void> {
    if (!editor) return;

    if (editor.selections.every((selection) => selection.isEmpty)) {
        if (vimState.mode === 'visual' || vimState.mode === 'visualLine') await enterMode(vimState, editor, 'normal');
    } else {
        if (vimState.mode === 'normal') {
            await enterMode(vimState, editor, 'visual');
        }
    }

    vimState.keysPressed = [];
}

function onDidChangeConfiguration(vimState: VimState, e: ConfigurationChangeEvent): void {
    if (!e.affectsConfiguration('simple-vim')) return;
    vimState.actions = buildActions();
}

export async function activate(context: ExtensionContext): Promise<void> {
    // Create comment config provider
    globalCommentConfigProvider = new CommentConfigProvider();

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(StatusBarAlignment.Left, 100);
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
        lastFt: undefined,
    };

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => onDidChangeActiveTextEditor(vimState, editor)),
        vscode.window.onDidChangeTextEditorSelection((e) => onSelectionChange(vimState, e)),
        vscode.workspace.onDidChangeConfiguration((e) => onDidChangeConfiguration(vimState, e)),
        vscode.commands.registerCommand('simple-vim.escapeKey', async () => escapeHandler(vimState)),
        vscode.commands.registerCommand('simple-vim.noop', () => {
            // Do nothing - used to ignore keys in certain modes
        }),
        vscode.commands.registerCommand('simple-vim.send', async (args: { keys: string }) => {
            if (!args || !args.keys) {
                console.error('simple-vim.send: keys argument is required');
                return;
            }
            await typeHandler(vimState, args.keys);
        }),
        vscode.commands.registerCommand('simple-vim.execute', async (args: unknown) => {
            // バリデーション
            if (!args || typeof args !== 'object' || !('keys' in args) || !Array.isArray(args.keys)) {
                console.error('simple-vim.execute: keys argument must be an array');
                return;
            }

            // アクティブなエディタの確認
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                console.error('simple-vim.execute: no active editor');
                return;
            }

            // Context の構築
            const context: Context = {
                editor,
                document: editor.document,
                vimState,
                commentConfigProvider: globalCommentConfigProvider,
            };

            // delegateAction で実行
            const result = await delegateAction(vimState.actions, context, args.keys);

            // 結果の出力
            if (result === 'noMatch') {
                vscode.window.showWarningMessage(
                    `simple-vim: どのアクションともマッチしませんでした: ${args.keys.join('')}`,
                );
            }
        }),
    );

    await enterMode(vimState, vscode.window.activeTextEditor, 'normal');

    if (vscode.window.activeTextEditor) {
        await onDidChangeActiveTextEditor(vimState, vscode.window.activeTextEditor);
    }
}
