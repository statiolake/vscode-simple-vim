import * as vscode from 'vscode';
import { enterMode } from '../modes';
import * as positionUtils from '../position_utils';
import type { VimState } from '../vimStateTypes';
import { adjustInsertPositions, getInsertRangesFromBeginning, getRegisterContentsList } from './common';

export function putAfter(vimState: VimState, editor: vscode.TextEditor) {
    const registerContentsList = getRegisterContentsList(vimState, editor);
    if (registerContentsList === undefined) return;

    if (vimState.mode === 'normal') {
        normalModeCharacterwise(editor, registerContentsList);
    } else if (vimState.mode === 'visual') {
        visualMode(vimState, editor, registerContentsList);
    } else {
        visualLineMode(vimState, editor, registerContentsList);
    }
}

function normalModeCharacterwise(editor: vscode.TextEditor, registerContentsList: (string | undefined)[]) {
    const insertPositions = editor.selections.map((selection) => {
        return positionUtils.right(editor.document, selection.active);
    });

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

function visualMode(vimState: VimState, editor: vscode.TextEditor, insertContentsList: (string | undefined)[]) {
    editor
        .edit((editBuilder) => {
            editor.selections.forEach((selection, i) => {
                const contents = insertContentsList[i];
                if (contents === undefined) return;

                editBuilder.delete(selection);
                editBuilder.insert(selection.start, contents);
            });
        })
        .then(() => {
            editor.selections = editor.selections.map((selection) => {
                const newPosition = positionUtils.left(selection.active);
                return new vscode.Selection(newPosition, newPosition);
            });
        });

    enterMode(vimState, editor, 'normal');
}

function visualLineMode(vimState: VimState, editor: vscode.TextEditor, registerContentsList: (string | undefined)[]) {
    editor
        .edit((editBuilder) => {
            editor.selections.forEach((selection, i) => {
                const registerContents = registerContentsList[i];
                if (registerContents === undefined) return;

                editBuilder.replace(selection, registerContents);
            });
        })
        .then(() => {
            editor.selections = editor.selections.map((selection) => {
                return new vscode.Selection(selection.start, selection.start);
            });

            enterMode(vimState, editor, 'normal');
        });
}
