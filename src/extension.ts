import * as vscode from 'vscode';
import { buildActions } from './actions';
import { reloadCustomBindings } from './custom_bindings';
import { escapeHandler } from './escape_handler';
import { enterNormalMode, enterVisualMode, setModeCursorStyle } from './modes';
import { Mode } from './modes_types';
import { typeHandler } from './type_handler';
import type { VimState } from './vim_state_types';

function onSelectionChange(vimState: VimState, e: vscode.TextEditorSelectionChangeEvent): void {
    if (vimState.mode === Mode.Insert) return;

    if (e.selections.every((selection) => selection.isEmpty)) {
        // It would be nice if we could always go from visual to normal mode when all selections are empty
        // but visual mode on an empty line will yield an empty selection and there's no good way of
        // distinguishing that case from the rest. So we only do it for mouse events.
        if (
            (vimState.mode === Mode.Visual || vimState.mode === Mode.VisualLine) &&
            e.kind === vscode.TextEditorSelectionChangeKind.Mouse
        ) {
            enterNormalMode(vimState);
            setModeCursorStyle(vimState.mode, e.textEditor);
        }
    } else {
        if (vimState.mode === Mode.Normal) {
            enterVisualMode(vimState);
            setModeCursorStyle(vimState.mode, e.textEditor);
        }
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

    vimState.keysPressed = [];
}

function onDidChangeConfiguration(vimState: VimState, e: vscode.ConfigurationChangeEvent): void {
    if (e.affectsConfiguration('simple-vim.customBindings')) {
        reloadCustomBindings();
        vimState.actions = buildActions();
    }
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
        semicolonAction: () => undefined,
        commaAction: () => undefined,
        lastPutRanges: {
            ranges: [],
            linewise: true,
        },
    };

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

    if (vscode.window.activeTextEditor) {
        onDidChangeActiveTextEditor(vimState, vscode.window.activeTextEditor);
    }
}
