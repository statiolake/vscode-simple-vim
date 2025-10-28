import * as vscode from 'vscode';
import type { Mode } from '../modesTypes';

type CursorStyleString = 'block' | 'block-outline' | 'line' | 'line-thin' | 'underline' | 'underline-thin';

const cursorStyleMap: Record<CursorStyleString, vscode.TextEditorCursorStyle> = {
    block: vscode.TextEditorCursorStyle.Block,
    'block-outline': vscode.TextEditorCursorStyle.BlockOutline,
    line: vscode.TextEditorCursorStyle.Line,
    'line-thin': vscode.TextEditorCursorStyle.LineThin,
    underline: vscode.TextEditorCursorStyle.Underline,
    'underline-thin': vscode.TextEditorCursorStyle.UnderlineThin,
};

const defaultCursorStyles: Record<Mode, CursorStyleString> = {
    normal: 'line',
    insert: 'line-thin',
    visual: 'line-thin',
    visualLine: 'line-thin',
};

function getCursorStyleConfigKey(mode: Mode): string {
    return `waltz.cursorStyle.${mode}`;
}

export function getCursorStyleForMode(mode: Mode): vscode.TextEditorCursorStyle {
    const configKey = getCursorStyleConfigKey(mode);
    const config = vscode.workspace.getConfiguration();
    const styleString = config.get<CursorStyleString>(configKey, defaultCursorStyles[mode]);

    return cursorStyleMap[styleString] ?? vscode.TextEditorCursorStyle.Line;
}

export function isValidCursorStyle(value: unknown): value is CursorStyleString {
    return typeof value === 'string' && value in cursorStyleMap;
}
