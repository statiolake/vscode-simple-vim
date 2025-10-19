import * as vscode from 'vscode';
import { Range } from 'vscode';
import type { Context } from '../context';
import { enterMode } from '../modes';
import { buildMotions } from '../motion/motions';
import { newWholeLineTextObject } from '../textObject/textObjectBuilder';
import { buildTextObjects } from '../textObject/textObjects';
import { updateSelections } from '../utils/cursor';
import { findAdjacentPosition, findLineEnd, findLineStartAfterIndent } from '../utils/positionFinder';
import { expandSelectionsToNextLineStart } from '../utils/visualLine';
import { saveCurrentSelectionsToRegister } from '../vimState';
import {
    motionToAction,
    newAction,
    newOperatorAction,
    newRegexAction,
    textObjectToVisualAction,
} from './actionBuilder';
import type { Action, ActionResult } from './actionTypes';
// VS Codeネイティブカーソル動作を常に使用

export function buildActions(): Action[] {
    const actions: Action[] = [];

    // Motion actions - すべてのmotionをNormal, Visual, VisualLineで使用可能にする
    const motions = buildMotions();
    console.log(`Building ${motions.length} motion actions`);
    actions.push(...motions.map((action) => motionToAction(action)));

    // モード操作
    actions.push(
        // VS Code のネイティブなカーソル位置を前提とすると i と a は同じ動作になる
        newAction({
            keys: ['i'],
            modes: ['normal'],
            execute: async (context) => {
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['a'],
            modes: ['normal'],
            execute: async (context) => {
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['I'],
            modes: ['normal'],
            execute: async (context) => {
                const newSelections = context.editor.selections.map((selection) => {
                    const newPosition = findLineStartAfterIndent(context.document, selection.active);
                    return new vscode.Selection(newPosition, newPosition);
                });
                updateSelections(context.editor, newSelections);
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['A'],
            modes: ['normal'],
            execute: async (context) => {
                const newSelections = context.editor.selections.map((selection) => {
                    const newPosition = findLineEnd(context.document, selection.active);
                    return new vscode.Selection(newPosition, newPosition);
                });
                updateSelections(context.editor, newSelections);
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['o'],
            modes: ['normal'],
            execute: async (context) => {
                await vscode.commands.executeCommand('editor.action.insertLineAfter');
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['O'],
            modes: ['normal'],
            execute: async (context) => {
                await vscode.commands.executeCommand('editor.action.insertLineBefore');
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        newAction({
            keys: ['v'],
            modes: ['normal', 'visualLine'],
            execute: async (context) => {
                enterMode(context.vimState, context.editor, 'visual');
            },
        }),

        newAction({
            keys: ['V'],
            modes: ['normal', 'visual'],
            execute: async (context) => {
                enterMode(context.vimState, context.editor, 'visualLine');
            },
        }),
    );

    // そのほかの基本操作
    actions.push(
        newAction({
            keys: ['u'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                await vscode.commands.executeCommand('undo');
                enterMode(context.vimState, context.editor, 'normal');
            },
        }),
    );

    // 編集操作
    actions.push(
        newAction({
            keys: ['x'],
            modes: ['normal'],
            execute: async (context) => {
                const newSelections = context.editor.selections.map((selection) => {
                    const newPosition = findAdjacentPosition(context.document, 'after', selection.active);
                    return new vscode.Selection(selection.active, newPosition);
                });
                updateSelections(context.editor, newSelections);
                saveCurrentSelectionsToRegister(context.vimState, context.editor, { isLinewise: false });
                await vscode.commands.executeCommand('deleteRight');
            },
        }),

        newAction({
            keys: ['p'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;

                // 現在の内容を保存し、以前の内容を取得する
                const contents = saveCurrentSelectionsToRegister(context.vimState, editor, { isLinewise: false });

                await editor.edit((editBuilder) => {
                    for (let i = 0; i < editor.selections.length; i++) {
                        const selection = editor.selections[i];

                        // マルチカーソル時は、カーソルの数とレジスタの数が一致するとは限らないので、一致する場合は対応
                        // する内容を、一致しない場合はすべての内容を結合したものを使用する
                        const content =
                            contents.length === editor.selections.length
                                ? contents[i]
                                : {
                                      text: contents.map((c) => c.text).join('\n'),
                                      isLinewise: contents.reduce((acc, c) => acc || c.isLinewise, false),
                                  };

                        if (selection.isEmpty && content.isLinewise) {
                            // linewise: 次の行に挿入
                            const line = context.document.lineAt(selection.active.line);
                            const insertPos = line.range.end;
                            // 通常 register 側に改行が含まれているが、今回改行を追加するのにかえってじゃまになるので削っておく
                            const insertText = content.text.endsWith('\n') ? content.text.slice(0, -1) : content.text;
                            editBuilder.insert(insertPos, `\n${insertText}`);
                        } else {
                            // 通常: 選択範囲位置に挿入
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

                // 現在の内容を保存し、以前の内容を取得する
                const contents = saveCurrentSelectionsToRegister(context.vimState, editor, { isLinewise: false });

                // 元のカーソル位置を offset で保存（挿入後に戻すため）
                const originalOffsets = editor.selections.map((s) => context.document.offsetAt(s.start));

                // 各挿入による offset の変化量を記録
                const insertionInfos: Array<{ offset: number; insertedLength: number; deletedLength: number }> = [];

                await editor.edit((editBuilder) => {
                    for (let i = 0; i < editor.selections.length; i++) {
                        const selection = editor.selections[i];

                        // マルチカーソル時は、カーソルの数とレジスタの数が一致するとは限らないので、一致する場合は対応
                        // する内容を、一致しない場合はすべての内容を結合したものを使用する
                        const content =
                            contents.length === editor.selections.length
                                ? contents[i]
                                : {
                                      text: contents.map((c) => c.text).join('\n'),
                                      isLinewise: contents.reduce((acc, c) => acc || c.isLinewise, false),
                                  };

                        if (selection.isEmpty && content.isLinewise) {
                            // linewise: 前の行に挿入
                            const line = context.document.lineAt(selection.active.line);
                            const insertPos = line.range.start;
                            // 通常 register 側に改行が含まれているが、今回改行を追加するのにかえってじゃまになるので削っておく
                            const insertText = content.text.endsWith('\n') ? content.text.slice(0, -1) : content.text;
                            editBuilder.insert(insertPos, `${insertText}\n`);

                            insertionInfos.push({
                                offset: context.document.offsetAt(insertPos),
                                insertedLength: insertText.length + 1, // +1 for \n
                                deletedLength: 0,
                            });
                        } else {
                            // 通常: カーソル位置に挿入
                            editBuilder.replace(selection, content.text);

                            insertionInfos.push({
                                offset: context.document.offsetAt(selection.start),
                                insertedLength: content.text.length,
                                deletedLength:
                                    context.document.offsetAt(selection.end) -
                                    context.document.offsetAt(selection.start),
                            });
                        }
                    }
                });

                // 元のカーソル位置に、挿入による影響を加味して戻す
                const newSelections = originalOffsets.map((offset, i) => {
                    let adjustedOffset = offset;

                    // 自分より前の挿入による影響を計算
                    for (let j = 0; j < i; j++) {
                        const info = insertionInfos[j];
                        if (info.offset <= offset) {
                            adjustedOffset += info.insertedLength - info.deletedLength;
                        }
                    }

                    const adjustedPos = context.document.positionAt(adjustedOffset);
                    return new vscode.Selection(adjustedPos, adjustedPos);
                });
                updateSelections(editor, newSelections);

                enterMode(context.vimState, context.editor, 'normal');
            },
        }),

        newAction({
            keys: ['J'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;
                const document = context.document;

                // コメント文字を取得
                const lineComment = context.commentConfigProvider.getLineComment(document.languageId);

                // ASCII文字かどうかを判定
                const isAscii = (char: string): boolean => char.charCodeAt(0) < 128;

                // スペースが必要かどうかを判定
                // 非ASCII同士（日本語同士など）の場合のみスペースを入れない
                const needsSpace = (prevChar: string, nextChar: string): boolean => {
                    return isAscii(prevChar) || isAscii(nextChar);
                };

                // 行を結合する関数
                const joinLines = (text: string): string => {
                    const lines = text.split('\n');
                    if (lines.length <= 1) return text;

                    let result = lines[0].trimEnd();

                    for (let i = 1; i < lines.length; i++) {
                        // 次の行の先頭の空白を除去し、コメント文字も削除
                        let nextLine = lines[i].trimStart();
                        if (lineComment && nextLine.startsWith(lineComment)) {
                            nextLine = nextLine.slice(lineComment.length).trimStart();
                        }
                        if (nextLine.length === 0) continue;

                        // スペースの必要性を判定
                        const lastChar = result[result.length - 1] || '';
                        const firstChar = nextLine[0] || '';
                        console.log(
                            `Joining lines: lastChar='${lastChar}', firstChar='${firstChar}', needsSpace=${needsSpace(lastChar, firstChar)}`,
                        );
                        const separator = needsSpace(lastChar, firstChar) ? ' ' : '';

                        result += separator + nextLine;
                    }

                    return result;
                };

                let ranges: Range[];
                if (context.vimState.mode !== 'normal') {
                    ranges = editor.selections.slice();
                } else {
                    const activeLine = document.lineAt(editor.selection.active.line);
                    const nextLine = document.lineAt(editor.selection.active.line + 1);
                    ranges = [new Range(activeLine.range.start, nextLine.range.end)];
                }

                await editor.edit((editBuilder) => {
                    for (const range of ranges) {
                        // visual mode の場合は選択範囲内の行を結合
                        const text = document.getText(range);
                        editBuilder.replace(range, joinLines(text));
                    }
                });
            },
        }),

        // r コマンド
        newRegexAction({
            pattern: /^r(?<replaceTo>.{1})$/,
            partial: /^r(.{0,1})$/,
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context, variables) => {
                const replaceChar = variables.replaceTo;
                if (!replaceChar || replaceChar.length !== 1) return;
                const editor = context.editor;

                await editor.edit((editBuilder) => {
                    for (const selection of editor.selections) {
                        let range: Range = selection;
                        if (selection.isEmpty) {
                            // カーソル位置の文字を置換
                            const position = selection.active;
                            range = new Range(position, position.translate(0, 1));
                        }

                        editBuilder.replace(range, replaceChar.repeat(range.end.character - range.start.character));
                    }
                });
                enterMode(context.vimState, context.editor, 'normal');
            },
        }),
    );

    // Viewport 制御
    actions.push(
        newAction({
            keys: ['z', 'z'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;
                if (!editor) return;

                const selection = editor.selection;
                await vscode.commands.executeCommand('revealLine', {
                    lineNumber: selection.active.line,
                    at: 'center',
                });
            },
        }),

        newAction({
            keys: ['z', 't'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;
                if (!editor) return;

                const selection = editor.selection;
                await vscode.commands.executeCommand('revealLine', {
                    lineNumber: selection.active.line,
                    at: 'top',
                });
            },
        }),

        newAction({
            keys: ['z', 'b'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;
                if (!editor) return;

                const selection = editor.selection;
                await vscode.commands.executeCommand('revealLine', {
                    lineNumber: selection.active.line,
                    at: 'bottom',
                });
            },
        }),
    );

    const textObjects = buildTextObjects(motions);

    // ビジュアルモードで選択範囲をテキストオブジェクトで指定するやつ。 viw など。一見 v + iw というオペレータに見える
    // が、v 自体がビジュアルモードに切り替えるコマンドなのでこれはできない。代わりに visual mode での iw コマンドとして
    // 振る舞う。
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
                if (matches.length === 0) return;

                saveCurrentSelectionsToRegister(context.vimState, context.editor, {
                    isLinewise: matches[0].isLinewise ?? false,
                });

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
            execute: async (context) => {
                await delegateAction(actions, context, ['d', '$']);
            },
        }),

        newOperatorAction({
            operatorKeys: ['y'],
            modes: ['normal'],
            textObjects: [newWholeLineTextObject({ keys: ['y'], includeLineBreak: true }), ...textObjects],
            execute: async (context, matches) => {
                if (matches.length === 0) return;

                saveCurrentSelectionsToRegister(context.vimState, context.editor, {
                    isLinewise: matches[0].isLinewise ?? false,
                });
            },
        }),
        newAction({
            keys: ['Y'],
            modes: ['normal'],
            execute: async (context) => {
                await delegateAction(actions, context, ['y', 'y']);
            },
        }),

        newOperatorAction({
            operatorKeys: ['c'],
            modes: ['normal'],
            textObjects: [newWholeLineTextObject({ keys: ['c'], includeLineBreak: false }), ...textObjects],
            execute: async (context, matches) => {
                if (matches.length === 0) return;

                saveCurrentSelectionsToRegister(context.vimState, context.editor, {
                    isLinewise: matches[0].isLinewise ?? false,
                });

                await context.editor.edit((editBuilder) => {
                    for (const match of matches) {
                        editBuilder.delete(match.range);
                    }
                });
                await enterMode(context.vimState, context.editor, 'insert');
            },
        }),
        newAction({
            keys: ['C'],
            modes: ['normal'],
            execute: async (context) => {
                await delegateAction(actions, context, ['c', '$']);
            },
        }),

        newAction({
            keys: ['s'],
            modes: ['normal'],
            execute: async (context) => {
                await delegateAction(actions, context, ['c', 'l']);
            },
        }),
        newAction({
            keys: ['S'],
            modes: ['normal'],
            execute: async (context) => {
                await delegateAction(actions, context, ['c', 'c']);
            },
        }),
    );

    // Visual モード
    actions.push(
        newAction({
            keys: ['d'],
            modes: ['visual', 'visualLine'],
            execute: async (context) => {
                if (context.vimState.mode === 'visualLine') {
                    // Visual Line モードは行末までしか選択しないので改行が含まれず、直接追加する必要がある
                    expandSelectionsToNextLineStart(context.editor);
                }
                saveCurrentSelectionsToRegister(context.vimState, context.editor, {
                    isLinewise: context.vimState.mode === 'visualLine',
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
            execute: async (context) => {
                if (context.vimState.mode === 'visualLine') {
                    // Visual Line モードは行末までしか選択しないので改行が含まれず、直接追加する必要がある
                    expandSelectionsToNextLineStart(context.editor);
                }
                saveCurrentSelectionsToRegister(context.vimState, context.editor, {
                    isLinewise: context.vimState.mode === 'visualLine',
                });

                enterMode(context.vimState, context.editor, 'normal');
            },
        }),

        newAction({
            keys: ['c'],
            modes: ['visual', 'visualLine'],
            execute: async (context) => {
                if (context.vimState.mode === 'visualLine') {
                    // Visual Line モードは行末までしか選択しないので改行が含まれず、直接追加する必要がある
                    expandSelectionsToNextLineStart(context.editor);
                }
                saveCurrentSelectionsToRegister(context.vimState, context.editor, {
                    isLinewise: context.vimState.mode === 'visualLine',
                });

                await context.editor.edit((editBuilder) => {
                    for (const selection of context.editor.selections) {
                        editBuilder.delete(selection);
                    }
                });
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),
        newAction({
            keys: ['s'],
            modes: ['visual', 'visualLine'],
            execute: async (context) => {
                await delegateAction(actions, context, ['c']);
            },
        }),
    );

    console.log(`Built ${actions.length} total actions`);
    return actions;
}

export async function delegateAction(actions: Action[], context: Context, keys: string[]): Promise<ActionResult> {
    let finalResult: 'noMatch' | 'needsMoreKey' = 'noMatch';
    for (const action of actions) {
        const result = await action(context, keys);
        if (result === 'executed') {
            return 'executed';
        } else if (result === 'needsMoreKey') {
            finalResult = 'needsMoreKey';
        }
    }

    return finalResult;
}
