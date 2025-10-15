import * as vscode from 'vscode';
import { buildActions } from './actionSystem/actions';
import { typeHandler } from './actionSystem/typeHandler';
import { escapeHandler } from './escape_handler';
import { enterNormalMode, enterVisualMode } from './modes';
import { Mode } from './modesTypes';
import { addTypeSubscription, removeTypeSubscription } from './type_subscription';
import type { VimState } from './vimStateTypes';

let statusBarItem: vscode.StatusBarItem;

export function updateStatusBar(mode: Mode): void {
    if (!statusBarItem) return;

    switch (mode) {
        case Mode.Normal:
            statusBarItem.text = '-- NORMAL --';
            break;
        case Mode.Insert:
            statusBarItem.text = '-- INSERT --';
            break;
        case Mode.Visual:
            statusBarItem.text = '-- VISUAL --';
            break;
        case Mode.VisualLine:
            statusBarItem.text = '-- VISUAL LINE --';
            break;
    }

    statusBarItem.show();
}

function onSelectionChange(vimState: VimState, e: vscode.TextEditorSelectionChangeEvent): void {
    const allEmpty = e.selections.every((selection) => selection.isEmpty);
    if (allEmpty && e.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
        // マウスをクリックしたことにより選択範囲が無になった場合は、ノーマルモードに戻る
        enterNormalMode(vimState, e.textEditor);
        updateStatusBar(vimState.mode);
    } else if (vimState.mode === Mode.VisualLine) {
        // Visual Line モードでは、常に選択範囲を行全体に拡張する
        e.textEditor.selections = e.textEditor.selections.map((selection) => {
            const anchorLine = selection.anchor.line;
            const activeLine = selection.active.line;
            const anchorCharacter = anchorLine <= activeLine ? 0 : e.textEditor.document.lineAt(anchorLine).text.length;
            const activeCharacter = anchorLine <= activeLine ? e.textEditor.document.lineAt(activeLine).text.length : 0;
            return new vscode.Selection(
                new vscode.Position(selection.anchor.line, anchorCharacter),
                new vscode.Position(selection.active.line, activeCharacter),
            );
        });
    } else if (!allEmpty) {
        // それ以外のモードで選択状態になった場合は Visual モードへ移行する
        enterVisualMode(vimState, e.textEditor);
        updateStatusBar(vimState.mode);
    }
}

function onDidChangeActiveTextEditor(vimState: VimState, editor: vscode.TextEditor | undefined) {
    if (!editor) return;

    if (editor.selections.every((selection) => selection.isEmpty)) {
        if (vimState.mode === Mode.Visual || vimState.mode === Mode.VisualLine) {
            enterNormalMode(vimState, editor);
        }
    } else {
        if (vimState.mode === Mode.Normal) {
            enterVisualMode(vimState, editor);
        }
    }

    updateStatusBar(vimState.mode);

    vimState.keysPressed = [];
}

function onDidChangeConfiguration(vimState: VimState, e: vscode.ConfigurationChangeEvent): void {
    if (!e.affectsConfiguration('simple-vim')) return;
    vimState.actions = buildActions();
}

export function activate(context: vscode.ExtensionContext): void {
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => onDidChangeActiveTextEditor(vimState, editor)),
        vscode.window.onDidChangeTextEditorSelection((e) => onSelectionChange(vimState, e)),
        vscode.workspace.onDidChangeConfiguration((e) => onDidChangeConfiguration(vimState, e)),
        vscode.commands.registerCommand('simple-vim.escapeKey', () => escapeHandler(vimState)),
    );

    const vimState: VimState = {
        typeSubscription: undefined,
        mode: Mode.Insert,
        keysPressed: [],
        actions: buildActions(),
        registers: {
            contentsList: [],
            linewise: true,
        },
        lastFtChar: '',
        lastPutRanges: {
            ranges: [],
            linewise: true,
        },
    };

    addTypeSubscription(vimState, typeHandler);
    context.subscriptions.push({ dispose: () => removeTypeSubscription(vimState) });

    enterNormalMode(vimState, vscode.window.activeTextEditor);
    updateStatusBar(vimState.mode);

    if (vscode.window.activeTextEditor) {
        onDidChangeActiveTextEditor(vimState, vscode.window.activeTextEditor);
    }
}
