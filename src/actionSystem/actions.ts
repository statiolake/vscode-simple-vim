import * as vscode from 'vscode';
import type { Action } from './actionTypes';
import { newAction, motionToAction, newOperatorAction } from './actionBuilder';
import { Mode } from '../modesTypes';
import { buildMotions } from '../motionSystem/motions';
import { buildTextObjects } from '../textObjectSystem/textObjects';
import { enterInsertMode, enterVisualMode, enterVisualLineMode, enterNormalMode, setModeCursorStyle } from '../modes';
import { removeTypeSubscription } from '../type_subscription';
// VS Codeネイティブカーソル動作を常に使用

export function buildActions(): Action[] {
    const actions: Action[] = [];

    // Motion actions - すべてのmotionをNormal, Visual, VisualLineで使用可能にする
    const motions = buildMotions();
    const motionModes = [Mode.Normal, Mode.Visual, Mode.VisualLine];

    console.log(`Building ${motions.length} motion actions`);

    for (const motion of motions) {
        actions.push(motionToAction(motion, motionModes));
    }

    // Insert mode actions
    actions.push(
        newAction({
            keys: ['i'],
            modes: [Mode.Normal],
            execute: (context, vimState) => {
                enterInsertMode(vimState);
                setModeCursorStyle(vimState.mode, context.editor);
                removeTypeSubscription(vimState);
            },
        }),

        newAction({
            keys: ['I'],
            modes: [Mode.Normal],
            execute: (context, vimState) => {
                context.editor.selections = context.editor.selections.map((selection) => {
                    const character = context.document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex;
                    const newPosition = selection.active.with({ character });
                    return new vscode.Selection(newPosition, newPosition);
                });

                enterInsertMode(vimState);
                setModeCursorStyle(vimState.mode, context.editor);
                removeTypeSubscription(vimState);
            },
        }),

        newAction({
            keys: ['a'],
            modes: [Mode.Normal],
            execute: (context, vimState) => {
                // VS Codeネイティブ：カーソルは既に正しい位置（文字と文字の間）にある
                enterInsertMode(vimState);
                setModeCursorStyle(vimState.mode, context.editor);
                removeTypeSubscription(vimState);
            },
        }),

        newAction({
            keys: ['A'],
            modes: [Mode.Normal],
            execute: (context, vimState) => {
                context.editor.selections = context.editor.selections.map((selection) => {
                    const lineLength = context.document.lineAt(selection.active.line).text.length;
                    const newPosition = selection.active.with({ character: lineLength });
                    return new vscode.Selection(newPosition, newPosition);
                });

                enterInsertMode(vimState);
                setModeCursorStyle(vimState.mode, context.editor);
                removeTypeSubscription(vimState);
            },
        }),

        newAction({
            keys: ['o'],
            modes: [Mode.Normal],
            execute: (context, vimState) => {
                vscode.commands.executeCommand('editor.action.insertLineAfter');
                enterInsertMode(vimState);
                setModeCursorStyle(vimState.mode, context.editor);
                removeTypeSubscription(vimState);
            },
        }),

        newAction({
            keys: ['O'],
            modes: [Mode.Normal],
            execute: (context, vimState) => {
                vscode.commands.executeCommand('editor.action.insertLineBefore');
                enterInsertMode(vimState);
                setModeCursorStyle(vimState.mode, context.editor);
                removeTypeSubscription(vimState);
            },
        }),
    );

    // Visual mode actions
    actions.push(
        newAction({
            keys: ['v'],
            modes: [Mode.Normal, Mode.VisualLine],
            execute: (context, vimState) => {
                if (vimState.mode === Mode.Normal) {
                    // Normal modeからVisual modeに入る：現在位置をanchorとして設定
                    context.editor.selections = context.editor.selections.map((selection) => {
                        return new vscode.Selection(selection.active, selection.active);
                    });
                }

                enterVisualMode(vimState);
                setModeCursorStyle(vimState.mode, context.editor);
            },
        }),

        newAction({
            keys: ['V'],
            modes: [Mode.Normal, Mode.Visual],
            execute: (context, vimState) => {
                // Visual Line mode: 行全体を選択
                context.editor.selections = context.editor.selections.map((selection) => {
                    const line = selection.active.line;
                    const lineText = context.document.lineAt(line).text;
                    return new vscode.Selection(
                        new vscode.Position(line, 0),
                        new vscode.Position(line, lineText.length),
                    );
                });

                enterVisualLineMode(vimState);
                setModeCursorStyle(vimState.mode, context.editor);
            },
        }),

        newAction({
            keys: ['Escape'],
            modes: [Mode.Visual, Mode.VisualLine],
            execute: (context, vimState) => {
                enterNormalMode(vimState);
                setModeCursorStyle(vimState.mode, context.editor);
            },
        }),
    );

    // Other actions
    actions.push(
        newAction({
            keys: ['u'],
            modes: [Mode.Normal, Mode.Visual, Mode.VisualLine],
            execute: (_context, _vimState) => {
                vscode.commands.executeCommand('undo');
            },
        }),

        newAction({
            keys: ['x'],
            modes: [Mode.Normal],
            execute: (_context, _vimState) => {
                vscode.commands.executeCommand('deleteRight');
            },
        }),

        newAction({
            keys: ['%'],
            modes: [Mode.Normal],
            execute: (_context, _vimState) => {
                vscode.commands.executeCommand('editor.action.jumpToBracket');
            },
        }),

        newAction({
            keys: ['J'],
            modes: [Mode.Normal, Mode.Visual, Mode.VisualLine],
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
            modes: [Mode.Normal],
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
            modes: [Mode.Normal],
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
            modes: [Mode.Normal],
            textObjects,
            execute: (context, vimState, ranges) => {
                context.editor
                    .edit((editBuilder) => {
                        for (const range of ranges) {
                            editBuilder.delete(range);
                        }
                    })
                    .then(() => {
                        enterInsertMode(vimState);
                        setModeCursorStyle(vimState.mode, context.editor);
                        removeTypeSubscription(vimState);
                    });
            },
        }),
    );

    // Visual mode operators (using current selection)
    actions.push(
        newAction({
            keys: ['d'],
            modes: [Mode.Visual, Mode.VisualLine],
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
                        enterNormalMode(vimState);
                        setModeCursorStyle(vimState.mode, context.editor);
                    });
            },
        }),

        newAction({
            keys: ['y'],
            modes: [Mode.Visual, Mode.VisualLine],
            execute: (context, vimState) => {
                if (context.editor.selections.length > 0) {
                    const selection = context.editor.selections[0];
                    const text = context.document.getText(selection);
                    vscode.env.clipboard.writeText(text);
                    vimState.registers.contentsList = [text];
                    vimState.registers.linewise = vimState.mode === Mode.VisualLine;
                }

                enterNormalMode(vimState);
                setModeCursorStyle(vimState.mode, context.editor);
            },
        }),

        newAction({
            keys: ['c'],
            modes: [Mode.Visual, Mode.VisualLine],
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
                        enterInsertMode(vimState);
                        setModeCursorStyle(vimState.mode, context.editor);
                        removeTypeSubscription(vimState);
                    });
            },
        }),
    );

    console.log(`Built ${actions.length} total actions`);
    return actions;
}
