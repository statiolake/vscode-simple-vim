import * as vscode from 'vscode';
import { Selection, type TextEditor } from 'vscode';
import type { Mode } from './modesTypes';
import { typeHandler } from './typeHandler';
import { getCursorStyleForMode } from './utils/cursorStyle';
import { getModeDisplayText } from './utils/modeDisplay';
import { expandSelectionsToFullLines } from './utils/visualLine';
import type { VimState } from './vimState';

export async function enterMode(vimState: VimState, editor: TextEditor | undefined, mode: Mode): Promise<void> {
    const oldMode = vimState.mode;

    // UI 関連は念のため常に再反映する
    vimState.mode = mode;
    updateModeContext(mode);
    updateCursorStyle(editor, mode);
    updateStatusBar(vimState, mode);

    // ここから先の処理は重たく副作用も大きいので、モードが変わらなかった場合はスキップする
    if (oldMode === mode) return;

    updateTypeHandler(vimState, mode);

    if (mode === 'normal' && editor) {
        // ノーマルモードに入ったら、選択範囲を解除する
        editor.selections = editor.selections.map((selection) => new Selection(selection.active, selection.active));
    }

    if (mode === 'visualLine' && editor) {
        // Visual Line モードに入ったら、選択範囲を行全体に拡張する
        expandSelectionsToFullLines(editor);
    }
}

function updateModeContext(mode: Mode) {
    vscode.commands.executeCommand('setContext', 'waltz.mode', mode);
}

function updateCursorStyle(editor: TextEditor | undefined, mode: Mode): void {
    if (!editor) return;

    editor.options.cursorStyle = getCursorStyleForMode(mode);
}

function updateStatusBar(vimState: VimState, mode: Mode): void {
    const { statusBarItem } = vimState;
    if (!statusBarItem) return;

    statusBarItem.text = getModeDisplayText(mode);
    statusBarItem.show();
}

function updateTypeHandler(vimState: VimState, mode: Mode): void {
    if (mode === 'insert' && vimState.typeSubscriptions.length > 0) {
        for (const sub of vimState.typeSubscriptions) sub.dispose();
        vimState.typeSubscriptions = [];
    } else if (vimState.typeSubscriptions.length === 0) {
        vimState.typeSubscriptions = [];
        vimState.typeSubscriptions.push(
            vscode.commands.registerCommand('type', (e) => {
                void typeHandler(vimState, e.text);
            }),
            vscode.commands.registerCommand('compositionStart', (_) => {
                // composition 関連のイベントはすべて無視する
            }),
            vscode.commands.registerCommand('compositionEnd', (_) => {
                // composition 関連のイベントはすべて無視する
            }),
            vscode.commands.registerCommand('replacePreviousChar', (_) => {
                // composition 関連のイベントはすべて無視する
            }),
        );
    }
}
