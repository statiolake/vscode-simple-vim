import * as vscode from 'vscode';
import { Range, Selection } from 'vscode';
import { enterMode } from '../../modes';
import { getRegisterContents, setRegisterContents } from '../../register';
import {
    findAdjacentPosition,
    findReplacedOffsetRanges,
    findWordBoundary,
    OffsetRange,
    type OffsetReplaceData,
} from '../../utils/positionFinder';
import { isCharacterTypeBoundary } from '../../utils/unicode';
import { newAction, newRegexAction } from '../actionBuilder';
import type { Action } from '../actionTypes';
import { adjustRangeForVisualLine } from './operator';

/**
 * 編集アクション
 */
export function buildEditActions(): Action[] {
    return [
        // x - カーソル位置の文字を削除
        newAction({
            keys: ['x'],
            modes: ['normal'],
            execute: async (context) => {
                const contents = context.editor.selections.map((selection) => {
                    const newPosition = findAdjacentPosition(context.document, 'after', selection.active);
                    return {
                        text: context.document.getText(new Range(selection.active, newPosition)),
                        isLinewise: false,
                    };
                });
                await setRegisterContents(context.vimState, contents);
                await vscode.commands.executeCommand('deleteRight');
            },
        }),

        // p - レジスタの内容をカーソル後にペースト
        newAction({
            keys: ['p'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;

                // レジスタの内容を取得する（クリップボード変更検出を含む）
                const contents = await getRegisterContents(context.vimState);
                const replaces: Array<OffsetReplaceData> = [];
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
                            const insertText = `\n${content.text.endsWith('\n') ? content.text.slice(0, -1) : content.text}`;
                            replaces.push({
                                range: OffsetRange.fromRange(context.document, new Range(insertPos, insertPos)),
                                newText: insertText,
                            });
                            editBuilder.insert(insertPos, insertText);
                        } else {
                            // 通常: 選択範囲位置に挿入
                            const range =
                                context.vimState.mode === 'visualLine'
                                    ? adjustRangeForVisualLine(context.document, selection)
                                    : selection;
                            editBuilder.replace(range, content.text);
                            replaces.push({
                                range: OffsetRange.fromRange(context.document, selection),
                                newText: content.text,
                            });
                        }
                    }
                });

                // 挿入後の範囲を一度選択して、また挿入後の位置にカーソルをセットする
                const newRanges = await findReplacedOffsetRanges(replaces);
                editor.selections = newRanges.map(
                    (r) =>
                        new Selection(
                            editor.document.positionAt(r.startOffset),
                            editor.document.positionAt(r.endOffset),
                        ),
                );
                editor.selections = newRanges.map(
                    (r) =>
                        new Selection(editor.document.positionAt(r.endOffset), editor.document.positionAt(r.endOffset)),
                );

                enterMode(context.vimState, context.editor, 'normal');
            },
        }),

        // P - レジスタの内容をカーソル前にペースト
        newAction({
            keys: ['P'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;

                // レジスタの内容を取得する（クリップボード変更検出を含む）
                const contents = await getRegisterContents(context.vimState);
                const replaces: Array<OffsetReplaceData> = [];
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
                            const insertText = `${content.text.endsWith('\n') ? content.text.slice(0, -1) : content.text}\n`;
                            replaces.push({
                                range: OffsetRange.fromRange(context.document, new Range(insertPos, insertPos)),
                                newText: insertText,
                            });
                            editBuilder.insert(insertPos, insertText);
                        } else {
                            // 通常: 選択範囲位置に挿入
                            const range =
                                context.vimState.mode === 'visualLine'
                                    ? adjustRangeForVisualLine(context.document, selection)
                                    : selection;
                            editBuilder.replace(range, content.text);
                            replaces.push({
                                range: OffsetRange.fromRange(context.document, selection),
                                newText: content.text,
                            });
                        }
                    }
                });

                // 挿入後の範囲を一度選択して、また挿入後の開始位置にカーソルをセットする
                // こうすることで cursorUndo したときに挿入された範囲を選択できる
                const newRanges = await findReplacedOffsetRanges(replaces);
                editor.selections = newRanges.map(
                    (r) =>
                        new Selection(
                            editor.document.positionAt(r.startOffset),
                            editor.document.positionAt(r.endOffset),
                        ),
                );
                editor.selections = newRanges.map(
                    (r) =>
                        new Selection(
                            editor.document.positionAt(r.startOffset),
                            editor.document.positionAt(r.startOffset),
                        ),
                );

                enterMode(context.vimState, context.editor, 'normal');
            },
        }),

        // J - 行を結合
        newAction({
            keys: ['J'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context) => {
                const editor = context.editor;
                const document = context.document;

                // コメント文字を取得
                const lineComment = context.commentConfigProvider.getConfig(document.languageId)?.lineComment || null;

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

        // r - 文字を置換
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

        // <Waltz>delete-word-left - Insert モードで前の単語を削除 (db相当、レジスタに保存しない)
        newAction({
            keys: ['<Waltz>delete-word-left'],
            modes: ['insert'],
            execute: async (context) => {
                const editor = context.editor;
                await editor.edit((editBuilder) => {
                    for (const selection of editor.selections) {
                        if (selection.isEmpty) {
                            const position = selection.active;
                            // b motion と同じ要領で前の単語の開始位置を探す
                            const nextPos = findAdjacentPosition(context.document, 'before', position);
                            const wordStart = findWordBoundary(
                                context.document,
                                'further',
                                'before',
                                nextPos,
                                isCharacterTypeBoundary,
                            );

                            if (wordStart) {
                                editBuilder.delete(new Range(wordStart, position));
                            }
                        }
                    }
                });
            },
        }),
    ];
}
