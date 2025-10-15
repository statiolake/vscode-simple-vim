import * as vscode from 'vscode';
import { enterMode } from '../modes';
import { buildMotions } from '../motionSystem/motions';
import { buildTextObjects } from '../textObjectSystem/textObjects';
import { expandSelectionsToFullLines } from '../visualLineUtils';
import { motionToAction, newAction, newOperatorAction } from './actionBuilder';
import type { Action } from './actionTypes';
// VS Codeネイティブカーソル動作を常に使用

export function buildActions(): Action[] {
    const actions: Action[] = [];

    // Motion actions - すべてのmotionをNormal, Visual, VisualLineで使用可能にする
    const motions = buildMotions();
    console.log(`Building ${motions.length} motion actions`);
    actions.push(...motions.map((action) => motionToAction(action)));

    // Insert mode actions
    actions.push(
        // VS Code のネイティブなカーソル位置を前提とすると i と a は同じ動作になる
        newAction({
            keys: ['i'],
            modes: ['normal'],
            execute: (context, vimState) => {
                enterMode(vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['a'],
            modes: ['normal'],
            execute: (context, vimState) => {
                enterMode(vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['I'],
            modes: ['normal'],
            execute: (context, vimState) => {
                context.editor.selections = context.editor.selections.map((selection) => {
                    const character = context.document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex;
                    const newPosition = selection.active.with({ character });
                    return new vscode.Selection(newPosition, newPosition);
                });

                enterMode(vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['A'],
            modes: ['normal'],
            execute: (context, vimState) => {
                context.editor.selections = context.editor.selections.map((selection) => {
                    const lineLength = context.document.lineAt(selection.active.line).text.length;
                    const newPosition = selection.active.with({ character: lineLength });
                    return new vscode.Selection(newPosition, newPosition);
                });

                enterMode(vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['o'],
            modes: ['normal'],
            execute: (context, vimState) => {
                vscode.commands.executeCommand('editor.action.insertLineAfter');
                enterMode(vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['O'],
            modes: ['normal'],
            execute: (context, vimState) => {
                vscode.commands.executeCommand('editor.action.insertLineBefore');
                enterMode(vimState, context.editor, 'insert');
            },
        }),
    );

    actions.push(
        newAction({
            keys: ['v'],
            modes: ['normal', 'visualLine'],
            execute: (context, vimState) => {
                enterMode(vimState, context.editor, 'visual');
            },
        }),

        newAction({
            keys: ['V'],
            modes: ['normal', 'visual'],
            execute: (context, vimState) => {
                enterMode(vimState, context.editor, 'visualLine');
                expandSelectionsToFullLines(context.editor);
            },
        }),

        newAction({
            keys: ['Escape'],
            modes: ['visual', 'visualLine'],
            execute: (context, vimState) => {
                enterMode(vimState, context.editor, 'normal');
            },
        }),
    );

    // Other actions
    actions.push(
        newAction({
            keys: ['u'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: (_context, _vimState) => {
                vscode.commands.executeCommand('undo');
            },
        }),

        newAction({
            keys: ['x'],
            modes: ['normal'],
            execute: (_context, _vimState) => {
                vscode.commands.executeCommand('deleteRight');
            },
        }),

        newAction({
            keys: ['%'],
            modes: ['normal'],
            execute: (_context, _vimState) => {
                vscode.commands.executeCommand('editor.action.jumpToBracket');
            },
        }),

        newAction({
            keys: ['J'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: (_context, _vimState) => {
                vscode.commands.executeCommand('editor.action.joinLines');
            },
        }),
    );

    // Operator actions: d, y, c
    // TextObjects (Motionsから変換されたものも含む)をターゲットとして使用
    const textObjects = buildTextObjects(motions);

    console.log(`Building operator actions with ${textObjects.length} text objects`);

    // Normal mode operators (with text objects)
    actions.push(
        newOperatorAction({
            operatorKeys: ['d'],
            modes: ['normal'],
            textObjects,
            execute: (context, _vimState, ranges) => {
                console.log('Delete operator executing with ranges:', ranges);
                for (const range of ranges) {
                    console.log('Range details:', {
                        start: range.start,
                        end: range.end,
                        isEmpty: range.isEmpty,
                        text: context.document.getText(range),
                    });
                }
                context.editor
                    .edit((editBuilder) => {
                        for (const range of ranges) {
                            console.log('Deleting range:', range);
                            editBuilder.delete(range);
                        }
                    })
                    .then((success) => {
                        console.log('Edit operation completed:', success);
                    });
            },
        }),

        newOperatorAction({
            operatorKeys: ['y'],
            modes: ['normal'],
            textObjects,
            execute: (context, vimState, ranges) => {
                if (ranges.length > 0) {
                    const text = context.document.getText(ranges[0]);
                    vscode.env.clipboard.writeText(text);
                    vimState.registers.contentsList = [text];
                    vimState.registers.linewise = false;
                }
            },
        }),

        newOperatorAction({
            operatorKeys: ['c'],
            modes: ['normal'],
            textObjects,
            execute: (context, vimState, ranges) => {
                context.editor
                    .edit((editBuilder) => {
                        for (const range of ranges) {
                            editBuilder.delete(range);
                        }
                    })
                    .then(() => {
                        enterMode(vimState, context.editor, 'insert');
                    });
            },
        }),
    );

    // Visual mode operators (using current selection)
    actions.push(
        newAction({
            keys: ['d'],
            modes: ['visual', 'visualLine'],
            execute: (context, vimState) => {
                const ranges = context.editor.selections.map(
                    (selection) => new vscode.Range(selection.start, selection.end),
                );

                context.editor
                    .edit((editBuilder) => {
                        for (const range of ranges) {
                            editBuilder.delete(range);
                        }
                    })
                    .then(() => {
                        enterMode(vimState, context.editor, 'normal');
                    });
            },
        }),

        newAction({
            keys: ['y'],
            modes: ['visual', 'visualLine'],
            execute: (context, vimState) => {
                if (context.editor.selections.length > 0) {
                    const selection = context.editor.selections[0];
                    const text = context.document.getText(selection);
                    vscode.env.clipboard.writeText(text);
                    vimState.registers.contentsList = [text];
                    vimState.registers.linewise = vimState.mode === 'visualLine';
                }

                enterMode(vimState, context.editor, 'normal');
            },
        }),

        newAction({
            keys: ['c'],
            modes: ['visual', 'visualLine'],
            execute: (context, vimState) => {
                const ranges = context.editor.selections.map(
                    (selection) => new vscode.Range(selection.start, selection.end),
                );

                context.editor
                    .edit((editBuilder) => {
                        for (const range of ranges) {
                            editBuilder.delete(range);
                        }
                    })
                    .then(() => {
                        enterMode(vimState, context.editor, 'insert');
                    });
            },
        }),
    );

    console.log(`Built ${actions.length} total actions`);
    return actions;
}
