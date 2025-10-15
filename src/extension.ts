import * as vscode from 'vscode';
import { buildActions } from './actionSystem/actions';
import { typeHandler } from './actionSystem/typeHandler';
import { escapeHandler } from './escape_handler';
import { enterNormalMode, enterVisualMode, setModeCursorStyle } from './modes';
import { Mode } from './modesTypes';
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
    if (e.selections.every((selection) => selection.isEmpty) && e.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
        // マウスをクリックしたことにより選択範囲が無になった場合は、ノーマルモードに戻る
        enterNormalMode(vimState);
        setModeCursorStyle(vimState.mode, e.textEditor);
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
    } else {
        // それ以外のモードで選択状態になった場合は Visual モードへ移行する
        enterVisualMode(vimState);
        setModeCursorStyle(vimState.mode, e.textEditor);
        updateStatusBar(vimState.mode);
    }
}

function onDidChangeActiveTextEditor(vimState: VimState, editor: vscode.TextEditor | undefined) {
    if (!editor) return;

    if (editor.selections.every((selection) => selection.isEmpty)) {
        if (vimState.mode === Mode.Visual || vimState.mode === Mode.VisualLine) {
            enterNormalMode(vimState);
        }
    } else {
        if (vimState.mode === Mode.Normal) {
            enterVisualMode(vimState);
        }
    }

    setModeCursorStyle(vimState.mode, editor);
    updateStatusBar(vimState.mode);

    vimState.keysPressed = [];
}

function onDidChangeConfiguration(vimState: VimState, e: vscode.ConfigurationChangeEvent): void {
    if (!e.affectsConfiguration('simple-vim')) return;
    vimState.actions = buildActions();
}

export function activate(context: vscode.ExtensionContext): void {
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

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register type command subscription
    vimState.typeSubscription = vscode.commands.registerCommand('type', (e) => {
        typeHandler(vimState, e.text);
    });

    context.subscriptions.push(
        vimState.typeSubscription,
        vscode.window.onDidChangeActiveTextEditor((editor) => onDidChangeActiveTextEditor(vimState, editor)),
        vscode.window.onDidChangeTextEditorSelection((e) => onSelectionChange(vimState, e)),
        vscode.workspace.onDidChangeConfiguration((e) => onDidChangeConfiguration(vimState, e)),
        vscode.commands.registerCommand('simple-vim.escapeKey', () => escapeHandler(vimState)),
    );

    enterNormalMode(vimState);
    updateStatusBar(vimState.mode);

    if (vscode.window.activeTextEditor) {
        onDidChangeActiveTextEditor(vimState, vscode.window.activeTextEditor);
    }
}
