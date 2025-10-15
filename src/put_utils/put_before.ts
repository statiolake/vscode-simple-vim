import * as vscode from 'vscode';

import * as positionUtils from '../position_utils';
import type { VimState } from '../vimStateTypes';
import { adjustInsertPositions, getInsertRangesFromBeginning, getRegisterContentsList } from './common';

export function putBefore(vimState: VimState, editor: vscode.TextEditor) {
    const registerContentsList = getRegisterContentsList(vimState, editor);
    if (registerContentsList === undefined) return;

    normalModeCharacterwise(editor, registerContentsList);
}

function normalModeCharacterwise(editor: vscode.TextEditor, registerContentsList: (string | undefined)[]) {
    const insertPositions = editor.selections.map((selection) => selection.active);
    const adjustedInsertPositions = adjustInsertPositions(insertPositions, registerContentsList);
    const insertRanges = getInsertRangesFromBeginning(adjustedInsertPositions, registerContentsList);

    editor
        .edit((editBuilder) => {
            insertPositions.forEach((insertPosition, i) => {
                const registerContents = registerContentsList[i];
                if (registerContents === undefined) return;

                editBuilder.insert(insertPosition, registerContents);
            });
        })
        .then(() => {
            editor.selections = editor.selections.map((selection, i) => {
                const range = insertRanges[i];
                if (range === undefined) return selection;

                const position = positionUtils.left(range.end);
                return new vscode.Selection(position, position);
            });
        });
}
