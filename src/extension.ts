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
import { getCursorStyleForMode } from './utils/cursorStyle';
import { getModeDisplayText } from './utils/modeDisplay';
import { expandSelectionsToFullLines } from './utils/visualLine';
import type { VimState } from './vimState';

// グローバルな CommentConfigProvider（起動時に一度だけ初期化）
export let globalCommentConfigProvider: CommentConfigProvider;

async function onSelectionChange(vimState: VimState, e: TextEditorSelectionChangeEvent): Promise<void> {
    // マウスで吹っ飛んだ後適当に入力したらキーコンビネーションとして認識されたとかはうれしくないので、入力されたキーは
    // リセットする。
    vimState.keysPressed = [];

    const allEmpty = e.selections.every((selection) => selection.isEmpty);
    if (allEmpty && e.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
        // マウスによる選択解除の場合はノーマルモードに戻る
        await enterMode(vimState, e.textEditor, 'normal');
    } else if (allEmpty && vimState.mode !== 'insert') {
        // 選択範囲が無になった場合は、ノーマルモードに戻る。この条件だとVisualモードにいて移動したあと逆方向に動かして
        // 選択範囲が無になったときもノーマルモードに戻るが、まあ良しとする。というのは、VS Code がundoなどの組み込みコ
        // マンドが一時的に非空の選択範囲を作成することがあり、最終的には空になるものの、そこでノーマルモードに戻れるよ
        // うにしなければならないから。しかし、それらもあくまでも「コマンドによる選択範囲変更」であり、このハンドラ内で
        // は vlh のケースと区別がつかない。 vlh などは比較的登場頻度が低いことを考えると、これでいいんじゃないか。
        await enterMode(vimState, e.textEditor, 'normal');
    } else if (vimState.mode === 'visualLine') {
        // Visual Line モードでは、選択範囲を行全体に拡張する
        expandSelectionsToFullLines(e.textEditor);
    } else if (!allEmpty) {
        // それ以外のモードで選択状態になった場合は Visual モードへ移行する
        await enterMode(vimState, e.textEditor, 'visual');
    }

    // 選択範囲の先頭が表示されるようにスクロールする
    // マルチカーソルの場合、最後のカーソル位置を reveal したいので最後のカーソルを見る
    const lastSelection = e.selections[e.selections.length - 1];
    // VisualLine モードの場合、通常行末にカーソルがあるが目線は行頭にあってほしいので、行頭を見る
    const focusAt = vimState.mode === 'visualLine' ? lastSelection.active.with({ character: 0 }) : lastSelection.active;
    e.textEditor.revealRange(new Range(focusAt, focusAt));
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
    if (!e.affectsConfiguration('waltz')) return;

    // Rebuild actions
    vimState.actions = buildActions();

    // Update cursor style if cursor style configuration changed
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        editor.options.cursorStyle = getCursorStyleForMode(vimState.mode);
    }

    // Update mode display if configuration changed
    if (vimState.statusBarItem) {
        vimState.statusBarItem.text = getModeDisplayText(vimState.mode);
    }
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
            lastClipboardText: '',
        },
        lastFt: undefined,
    };

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => onDidChangeActiveTextEditor(vimState, editor)),
        vscode.window.onDidChangeTextEditorSelection((e) => onSelectionChange(vimState, e)),
        vscode.workspace.onDidChangeConfiguration((e) => onDidChangeConfiguration(vimState, e)),
        vscode.commands.registerCommand('waltz.escapeKey', async () => {
            await vscode.commands.executeCommand('hideSuggestWidget');
            await escapeHandler(vimState);
        }),
        vscode.commands.registerCommand('waltz.noop', () => {
            // Do nothing - used to ignore keys in certain modes
        }),
        vscode.commands.registerCommand('waltz.send', async (args: { keys: string }) => {
            if (!args || !args.keys) {
                console.error('waltz.send: keys argument is required');
                return;
            }
            await typeHandler(vimState, args.keys);
        }),
        vscode.commands.registerCommand('waltz.execute', async (args: unknown) => {
            // バリデーション
            if (!args || typeof args !== 'object' || !('keys' in args) || !Array.isArray(args.keys)) {
                console.error('waltz.execute: keys argument must be an array');
                return;
            }

            // アクティブなエディタの確認
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                console.error('waltz.execute: no active editor');
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
                    `Waltz: どのアクションともマッチしませんでした: ${args.keys.join('')}`,
                );
            }
        }),
    );

    await enterMode(vimState, vscode.window.activeTextEditor, 'normal');

    if (vscode.window.activeTextEditor) {
        await onDidChangeActiveTextEditor(vimState, vscode.window.activeTextEditor);
    }
}
