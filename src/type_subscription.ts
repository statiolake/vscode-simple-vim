import * as vscode from 'vscode';

import type { VimState } from './vimStateTypes';

export function addTypeSubscription(
    vimState: VimState,
    typeHandler: (vimState: VimState, char: string) => void,
): vscode.Disposable {
    const typeSubscription = vscode.commands.registerCommand('type', (e) => {
        typeHandler(vimState, e.text);
    });
    vimState.typeSubscription = typeSubscription;
    return typeSubscription;
}

export function removeTypeSubscription(vimState: VimState): void {
    if (vimState.typeSubscription) {
        vimState.typeSubscription.dispose();
        vimState.typeSubscription = undefined;
    }
}
