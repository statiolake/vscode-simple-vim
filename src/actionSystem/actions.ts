import * as vscode from 'vscode';
import type { Context } from '../context';
import { enterMode } from '../modes';
import { buildMotions } from '../motionSystem/motions';
import { newWholeLineTextObject } from '../textObjectSystem/textObjectBuilder';
import { buildTextObjects } from '../textObjectSystem/textObjects';
import { motionToAction, newAction, newOperatorAction, textObjectToVisualAction } from './actionBuilder';
import type { Action, ActionResult } from './actionTypes';
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
            execute: (context) => {
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['a'],
            modes: ['normal'],
            execute: (context) => {
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['I'],
            modes: ['normal'],
            execute: (context) => {
                context.editor.selections = context.editor.selections.map((selection) => {
                    const character = context.document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex;
                    const newPosition = selection.active.with({ character });
                    return new vscode.Selection(newPosition, newPosition);
                });

                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['A'],
            modes: ['normal'],
            execute: (context) => {
                context.editor.selections = context.editor.selections.map((selection) => {
                    const lineLength = context.document.lineAt(selection.active.line).text.length;
                    const newPosition = selection.active.with({ character: lineLength });
                    return new vscode.Selection(newPosition, newPosition);
                });

                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['o'],
            modes: ['normal'],
            execute: (context) => {
                vscode.commands.executeCommand('editor.action.insertLineAfter');
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['O'],
            modes: ['normal'],
            execute: (context) => {
                vscode.commands.executeCommand('editor.action.insertLineBefore');
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),
    );

    actions.push(
        newAction({
            keys: ['v'],
            modes: ['normal', 'visualLine'],
            execute: (context) => {
                enterMode(context.vimState, context.editor, 'visual');
            },
        }),

        newAction({
            keys: ['V'],
            modes: ['normal', 'visual'],
            execute: (context) => {
                enterMode(context.vimState, context.editor, 'visualLine');
            },
        }),
    );

    // そのほかの基本操作
    actions.push(
        newAction({
            keys: ['u'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: (context) => {
                vscode.commands.executeCommand('undo');
                enterMode(context.vimState, context.editor, 'normal');
            },
        }),

        newAction({
            keys: ['x'],
            modes: ['normal'],
            execute: (context) => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) return;

                context.vimState.register.contents = editor.selections.map((selection) => ({
                    text: editor.document.getText(new vscode.Range(selection.active, selection.active.translate(0, 1))),
                    isLinewise: false,
                }));

                vscode.commands.executeCommand('deleteRight');
            },
        }),

        newAction({
            keys: ['p'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;
                if (!editor) return;

                const contents = context.vimState.register.contents;
                if (context.vimState.mode !== 'normal') {
                    // 現在の内容を保存しておく
                    context.vimState.register.contents = editor.selections.map((selection) => {
                        const text = context.document.getText(selection);
                        if (!text) return undefined;
                        return { text, isLinewise: false };
                    });
                }

                await editor.edit((editBuilder) => {
                    for (let i = 0; i < editor.selections.length; i++) {
                        const selection = editor.selections[i];
                        // マルチカーソル対応: 要素数が一致しない場合はすべて結合してフォールバック
                        const content =
                            contents.length === editor.selections.length
                                ? (contents[i] ?? { text: '', isLinewise: false })
                                : {
                                      text: contents.map((c) => c?.text ?? '').join('\n'),
                                      isLinewise: contents.reduce((acc, c) => acc || (c?.isLinewise ?? false), false),
                                  };

                        if (selection.isEmpty && content.isLinewise) {
                            // linewise: 次の行に挿入
                            const line = context.document.lineAt(selection.active.line);
                            const insertPos = line.range.end;
                            // 通常 register 側に改行が含まれているが、今回改行を追加するのにかえってじゃまになるので削っておく
                            const insertText = content.text.endsWith('\n') ? content.text.slice(0, -1) : content.text;
                            editBuilder.insert(insertPos, `\n${insertText}`);
                        } else {
                            // 通常: カーソル位置に挿入
                            editBuilder.replace(selection, content.text);
                        }
                    }
                });

                enterMode(context.vimState, context.editor, 'normal');
            },
        }),

        newAction({
            keys: ['P'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;
                if (!editor) return;

                const contents = context.vimState.register.contents;
                if (context.vimState.mode !== 'normal') {
                    // 現在の内容を保存しておく
                    context.vimState.register.contents = editor.selections.map((selection) => ({
                        text: context.document.getText(selection),
                        isLinewise: false,
                    }));
                }

                const originalSelections = editor.selections;
                await editor.edit((editBuilder) => {
                    for (let i = 0; i < editor.selections.length; i++) {
                        const selection = editor.selections[i];
                        // マルチカーソル対応: 要素数が一致しない場合はすべて結合してフォールバック
                        const content =
                            contents.length === editor.selections.length
                                ? (contents[i] ?? { text: '', isLinewise: false })
                                : {
                                      text: contents.map((c) => c?.text ?? '').join('\n'),
                                      isLinewise: contents.reduce((acc, c) => acc || (c?.isLinewise ?? false), false),
                                  };

                        if (selection.isEmpty && content.isLinewise) {
                            // linewise: 前の行に挿入
                            const line = context.document.lineAt(selection.active.line);
                            const insertPos = line.range.start;
                            // 通常 register 側に改行が含まれているが、今回改行を追加するのにかえってじゃまになるので削っておく
                            const insertText = content.text.endsWith('\n') ? content.text.slice(0, -1) : content.text;
                            editBuilder.insert(insertPos, `${insertText}\n`);
                        } else {
                            // 通常: カーソル位置に挿入
                            editBuilder.replace(selection, content.text);
                        }
                    }
                });
                editor.selections = originalSelections;

                enterMode(context.vimState, context.editor, 'normal');
            },
        }),

        newAction({
            keys: ['J'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: () => {
                vscode.commands.executeCommand('editor.action.joinLines');
            },
        }),
    );

    // Viewport 制御
    actions.push(
        newAction({
            keys: ['z', 'z'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: (context) => {
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
            execute: (context) => {
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
            execute: (context) => {
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
    const textObjects = buildTextObjects(motions);

    // ビジュアルモードで選択範囲をテキストオブジェクトで指定するためのやつ
    actions.push(...textObjects.map((obj) => textObjectToVisualAction(obj)));

    // オペレータ: d, y, c
    console.log(`Building operator actions with ${textObjects.length} text objects`);

    // Normal モード
    actions.push(
        newOperatorAction({
            operatorKeys: ['d'],
            modes: ['normal'],
            textObjects: [newWholeLineTextObject({ keys: ['d'], includeLineBreak: true }), ...textObjects],
            execute: async (context, matches) => {
                context.vimState.register.contents = matches.map((match) => ({
                    text: context.document.getText(match.range),
                    isLinewise: match.isLinewise ?? false,
                }));
                await context.editor.edit((editBuilder) => {
                    for (const match of matches) {
                        editBuilder.delete(match.range);
                    }
                });
            },
        }),
        newAction({
            keys: ['D'],
            modes: ['normal'],
            execute: async (context) => delegateAction(actions, context, ['d', '$']),
        }),

        newOperatorAction({
            operatorKeys: ['y'],
            modes: ['normal'],
            textObjects: [newWholeLineTextObject({ keys: ['y'], includeLineBreak: true }), ...textObjects],
            execute: (context, matches) => {
                context.vimState.register.contents = matches.map((match) => ({
                    text: context.document.getText(match.range),
                    isLinewise: match.isLinewise ?? false,
                }));
            },
        }),
        newAction({
            keys: ['Y'],
            modes: ['normal'],
            execute: (context) => delegateAction(actions, context, ['y', 'y']),
        }),

        newOperatorAction({
            operatorKeys: ['c'],
            modes: ['normal'],
            textObjects: [newWholeLineTextObject({ keys: ['c'], includeLineBreak: false }), ...textObjects],
            execute: async (context, matches) => {
                context.vimState.register.contents = matches.map((match) => ({
                    text: context.document.getText(match.range),
                    isLinewise: match.isLinewise ?? false,
                }));
                await context.editor.edit((editBuilder) => {
                    for (const match of matches) {
                        editBuilder.delete(match.range);
                    }
                });
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),
        newAction({
            keys: ['C'],
            modes: ['normal'],
            execute: async (context) => delegateAction(actions, context, ['c', '$']),
        }),
    );

    // Visual モード
    actions.push(
        newAction({
            keys: ['d'],
            modes: ['visual', 'visualLine'],
            execute: async (context) => {
                context.vimState.register.contents = context.editor.selections.map((selection) => {
                    let adjustedSelection = selection;
                    if (context.vimState.mode === 'visualLine' && selection.end.character !== 0) {
                        // Visual Line モードは行末までしか選択しないので改行が含まれず、直接追加する必要がある
                        adjustedSelection = new vscode.Selection(
                            selection.start,
                            selection.end.translate(1, 0).with({ character: 0 }),
                        );
                    }
                    const text = context.document.getText(adjustedSelection);
                    const isLinewise = context.vimState.mode === 'visualLine';
                    return { text, isLinewise };
                });

                await context.editor.edit((editBuilder) => {
                    for (const selection of context.editor.selections) {
                        editBuilder.delete(selection);
                    }
                });
                enterMode(context.vimState, context.editor, 'normal');
            },
        }),

        newAction({
            keys: ['y'],
            modes: ['visual', 'visualLine'],
            execute: (context) => {
                context.vimState.register.contents = context.editor.selections.map((selection) => {
                    let adjustedSelection = selection;
                    if (context.vimState.mode === 'visualLine' && selection.end.character !== 0) {
                        // Visual Line モードは行末までしか選択しないので改行が含まれず、直接追加する必要がある
                        adjustedSelection = new vscode.Selection(
                            selection.start,
                            selection.end.translate(1, 0).with({ character: 0 }),
                        );
                    }
                    const text = context.document.getText(adjustedSelection);
                    const isLinewise = context.vimState.mode === 'visualLine';
                    return { text, isLinewise };
                });
                enterMode(context.vimState, context.editor, 'normal');
            },
        }),

        newAction({
            keys: ['c'],
            modes: ['visual', 'visualLine'],
            execute: async (context) => {
                context.vimState.register.contents = context.editor.selections.map((selection) => {
                    let adjustedSelection = selection;
                    if (context.vimState.mode === 'visualLine' && selection.end.character !== 0) {
                        // Visual Line モードは行末までしか選択しないので改行が含まれず、直接追加する必要がある
                        adjustedSelection = new vscode.Selection(
                            selection.start,
                            selection.end.translate(1, 0).with({ character: 0 }),
                        );
                    }
                    const text = context.document.getText(adjustedSelection);
                    const isLinewise = context.vimState.mode === 'visualLine';
                    return { text, isLinewise };
                });

                await context.editor.edit((editBuilder) => {
                    for (const selection of context.editor.selections) {
                        editBuilder.delete(selection);
                    }
                });
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),
    );

    console.log(`Built ${actions.length} total actions`);
    return actions;
}

export function delegateAction(actions: Action[], context: Context, keys: string[]): ActionResult {
    let finalResult: 'noMatch' | 'needsMoreKey' = 'noMatch';
    for (const action of actions) {
        const result = action(context, keys);
        if (result === 'executed') {
            return 'executed';
        } else if (result === 'needsMoreKey') {
            finalResult = 'needsMoreKey';
        }
    }

    return finalResult;
}
