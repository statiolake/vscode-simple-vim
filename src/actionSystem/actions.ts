import * as vscode from 'vscode';
import { enterMode } from '../modes';
import { buildMotions } from '../motionSystem/motions';
import { newWholeLineTextObject } from '../textObjectSystem/textObjectBuilder';
import { buildTextObjects } from '../textObjectSystem/textObjects';
import { motionToAction, newAction, newOperatorAction, textObjectToVisualAction } from './actionBuilder';
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
            },
        }),
    );

    // そのほかの基本操作
    actions.push(
        newAction({
            keys: ['u'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: (context, vimState) => {
                vscode.commands.executeCommand('undo');
                enterMode(vimState, context.editor, 'normal');
            },
        }),

        newAction({
            keys: ['x'],
            modes: ['normal'],
            execute: (_context, vimState) => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) return;

                const nextChars = editor.selections.map((selection) =>
                    editor.document.getText(new vscode.Range(selection.active, selection.active.translate(0, 1))),
                );
                vimState.register.contents = nextChars;

                vscode.commands.executeCommand('deleteRight');
            },
        }),

        newAction({
            keys: ['p'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context, vimState) => {
                const editor = context.editor;
                if (!editor) return;

                const contents = vimState.register.contents;
                if (vimState.mode !== 'normal') {
                    // 現在の内容を保存しておく
                    vimState.register.contents = editor.selections.map((selection) =>
                        context.document.getText(selection),
                    );
                }

                await context.editor.edit((editBuilder) => {
                    for (let i = 0; i < editor.selections.length; i++) {
                        const selection = editor.selections[i];
                        const content =
                            contents.length === editor.selections.length ? (contents[i] ?? '') : contents.join('\n');
                        editBuilder.replace(selection, content);
                    }
                });

                enterMode(vimState, context.editor, 'normal');
            },
        }),

        newAction({
            keys: ['P'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context, vimState) => {
                const editor = context.editor;
                if (!editor) return;

                const contents = vimState.register.contents;
                if (vimState.mode !== 'normal') {
                    // 現在の内容を保存しておく
                    vimState.register.contents = editor.selections.map((selection) =>
                        context.document.getText(selection),
                    );
                }

                await context.editor.edit((editBuilder) => {
                    for (let i = 0; i < editor.selections.length; i++) {
                        const selection = editor.selections[i];
                        const content =
                            contents.length === editor.selections.length ? (contents[i] ?? '') : contents.join('\n');
                        editBuilder.replace(selection, content);
                    }
                });

                enterMode(vimState, context.editor, 'normal');
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

    // Viewport 制御
    actions.push(
        newAction({
            keys: ['z', 'z'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: (context, _vimState) => {
                const editor = context.editor;
                if (!editor) return;

                const selection = editor.selection;
                vscode.commands.executeCommand('revealLine', {
                    lineNumber: selection.active.line,
                    at: 'center',
                });
            },
        }),

        newAction({
            keys: ['z', 't'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: (context, _vimState) => {
                const editor = context.editor;
                if (!editor) return;

                const selection = editor.selection;
                vscode.commands.executeCommand('revealLine', {
                    lineNumber: selection.active.line,
                    at: 'top',
                });
            },
        }),

        newAction({
            keys: ['z', 'b'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: (context, _vimState) => {
                const editor = context.editor;
                if (!editor) return;

                const selection = editor.selection;
                vscode.commands.executeCommand('revealLine', {
                    lineNumber: selection.active.line,
                    at: 'bottom',
                });
            },
        }),
    );

    // オペレータ: d, y, c
    // TextObjects (Motionsから変換されたものも含む)をターゲットとして使用
    const textObjects = buildTextObjects(motions);

    // ビジュアルモードで選択範囲をテキストオブジェクトで指定するためのやつ
    actions.push(...textObjects.map((obj) => textObjectToVisualAction(obj)));

    console.log(`Building operator actions with ${textObjects.length} text objects`);

    // Normal モード
    actions.push(
        newOperatorAction({
            operatorKeys: ['d'],
            modes: ['normal'],
            wholeLineTextObject: newWholeLineTextObject({ keys: ['d'], includeLineBreak: true }),
            textObjects,
            execute: async (context, vimState, ranges) => {
                vimState.register.contents = ranges.map((range) => context.document.getText(range));
                await context.editor.edit((editBuilder) => {
                    for (const range of ranges) {
                        editBuilder.delete(range);
                    }
                });
            },
        }),
        newAction({
            keys: ['D'],
            modes: ['normal'],
            execute: async (context, vimState) => {
                const editor = context.editor;
                if (!editor) return;

                const ranges = editor.selections.map((selection) => {
                    const line = context.document.lineAt(selection.active.line);
                    return new vscode.Range(selection.active, line.range.end);
                });

                vimState.register.contents = ranges.map((range) => context.document.getText(range));
                await editor.edit((editBuilder) => {
                    for (const range of ranges) {
                        editBuilder.delete(range);
                    }
                });
            },
        }),

        newOperatorAction({
            operatorKeys: ['y'],
            wholeLineTextObject: newWholeLineTextObject({ keys: ['y'], includeLineBreak: true }),
            modes: ['normal'],
            textObjects,
            execute: (context, vimState, ranges) => {
                vimState.register.contents = ranges.map((range) => context.document.getText(range));
            },
        }),
        newAction({
            keys: ['Y'],
            modes: ['normal'],
            execute: (context, vimState) => {
                const editor = context.editor;
                if (!editor) return;

                const ranges = editor.selections.map((selection) => {
                    const line = context.document.lineAt(selection.active.line);
                    return line.rangeIncludingLineBreak;
                });

                vimState.register.contents = ranges.map((range) => context.document.getText(range));
            },
        }),

        newOperatorAction({
            operatorKeys: ['c'],
            modes: ['normal'],
            wholeLineTextObject: newWholeLineTextObject({ keys: ['c'], includeLineBreak: false }),
            textObjects,
            execute: async (context, vimState, ranges) => {
                vimState.register.contents = ranges.map((range) => context.document.getText(range));
                await context.editor.edit((editBuilder) => {
                    for (const range of ranges) {
                        editBuilder.delete(range);
                    }
                });
                enterMode(vimState, context.editor, 'insert');
            },
        }),
        newAction({
            keys: ['C'],
            modes: ['normal'],
            execute: async (context, vimState) => {
                const editor = context.editor;
                if (!editor) return;

                const ranges = editor.selections.map((selection) => {
                    const line = context.document.lineAt(selection.active.line);
                    return new vscode.Range(selection.active, line.range.end);
                });

                vimState.register.contents = ranges.map((range) => context.document.getText(range));
                await editor.edit((editBuilder) => {
                    for (const range of ranges) {
                        editBuilder.delete(range);
                    }
                });
                enterMode(vimState, context.editor, 'insert');
            },
        }),
    );

    // Visual モード
    actions.push(
        newAction({
            keys: ['d'],
            modes: ['visual', 'visualLine'],
            execute: async (context, vimState) => {
                vimState.register.contents = context.editor.selections.map((selection) =>
                    context.document.getText(selection),
                );
                await context.editor.edit((editBuilder) => {
                    for (const selection of context.editor.selections) {
                        editBuilder.delete(selection);
                    }
                });
                enterMode(vimState, context.editor, 'normal');
            },
        }),

        newAction({
            keys: ['y'],
            modes: ['visual', 'visualLine'],
            execute: (context, vimState) => {
                vimState.register.contents = context.editor.selections.map((selection) =>
                    context.document.getText(selection),
                );
                enterMode(vimState, context.editor, 'normal');
            },
        }),

        newAction({
            keys: ['c'],
            modes: ['visual', 'visualLine'],
            execute: async (context, vimState) => {
                vimState.register.contents = context.editor.selections.map((selection) =>
                    context.document.getText(selection),
                );

                await context.editor.edit((editBuilder) => {
                    for (const selection of context.editor.selections) {
                        editBuilder.delete(selection);
                    }
                });
                enterMode(vimState, context.editor, 'insert');
            },
        }),
    );

    console.log(`Built ${actions.length} total actions`);
    return actions;
}
