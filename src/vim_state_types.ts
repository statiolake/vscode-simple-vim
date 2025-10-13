import type * as vscode from 'vscode';

import type { Mode } from './modes_types';

export type VimState = {
    typeSubscription: vscode.Disposable | undefined;
    mode: Mode;
    keysPressed: string[];
    registers: {
        contentsList: (string | undefined)[];
        linewise: boolean;
    };
    semicolonAction: (vimState: VimState, editor: vscode.TextEditor) => void;
    commaAction: (vimState: VimState, editor: vscode.TextEditor) => void;
    lastPutRanges: {
        ranges: (vscode.Range | undefined)[];
        linewise: boolean;
    };
};
