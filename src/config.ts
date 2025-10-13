import * as vscode from 'vscode';

export type CursorBehavior = 'vscode-native' | 'vim-traditional';

export function getCursorBehavior(): CursorBehavior {
    const config = vscode.workspace.getConfiguration('simple-vim');
    return (config.get<CursorBehavior>('cursorBehavior') || 'vscode-native') as CursorBehavior;
}

export function isVscodeNativeCursor(): boolean {
    return getCursorBehavior() === 'vscode-native';
}
