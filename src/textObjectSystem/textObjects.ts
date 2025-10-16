import * as vscode from 'vscode';
import type { Motion } from '../motionSystem/motionTypes';
import { whitespaceWordRanges, wordRanges } from '../word_utils';
import { newTextObject } from './textObjectBuilder';
import type { TextObject } from './textObjectTypes';

/**
 * MotionをTextObjectに変換
 * Motionの開始位置から終了位置までのRangeを返すTextObjectを作成
 */
export function motionToTextObject(motion: Motion): TextObject {
    return (context, keys, position) => {
        const motionResult = motion(context, keys, position);

        if (motionResult.result === 'noMatch') {
            return { result: 'noMatch' };
        }

        if (motionResult.result === 'needsMoreKey') {
            return { result: 'needsMoreKey' };
        }

        // MotionのpositionからRangeを作成
        // VS Codeネイティブ仕様：カーソルは文字と文字の間にある
        const targetPosition = motionResult.position;
        let range: vscode.Range;

        if (targetPosition.isBefore(position)) {
            range = new vscode.Range(targetPosition, position);
        } else {
            range = new vscode.Range(position, targetPosition);
        }

        return { result: 'match', data: { range } };
    };
}

/**
 * すべてのTextObjectを返す
 * motionsを受け取り、それらもTextObjectとして使用可能にする
 */
export function buildTextObjects(motions: Motion[]): TextObject[] {
    const textObjects: TextObject[] = [];

    // MotionsをTextObjectsに変換
    for (const motion of motions) {
        textObjects.push(motionToTextObject(motion));
    }

    // Word text objects
    textObjects.push(
        newTextObject({
            keys: ['i', 'w'],
            compute: (context, position) => {
                const lineText = context.document.lineAt(position.line).text;
                const ranges = wordRanges(lineText);

                for (const range of ranges) {
                    if (position.character >= range.start && position.character <= range.end) {
                        const result = new vscode.Range(position.line, range.start, position.line, range.end);
                        return result;
                    }
                }

                return new vscode.Range(position, position);
            },
        }),

        newTextObject({
            keys: ['a', 'w'],
            compute: (context, position) => {
                const lineText = context.document.lineAt(position.line).text;
                const ranges = wordRanges(lineText);

                for (const range of ranges) {
                    if (position.character >= range.start && position.character < range.end) {
                        return new vscode.Range(position.line, range.start, position.line, range.end);
                    }
                }

                return new vscode.Range(position, position);
            },
        }),

        newTextObject({
            keys: ['i', 'W'],
            compute: (context, position) => {
                const lineText = context.document.lineAt(position.line).text;
                const ranges = whitespaceWordRanges(lineText);

                for (const range of ranges) {
                    if (position.character >= range.start && position.character < range.end) {
                        return new vscode.Range(position.line, range.start, position.line, range.end);
                    }
                }

                return new vscode.Range(position, position);
            },
        }),

        newTextObject({
            keys: ['a', 'W'],
            compute: (context, position) => {
                const lineText = context.document.lineAt(position.line).text;
                const ranges = whitespaceWordRanges(lineText);

                for (const range of ranges) {
                    if (position.character >= range.start && position.character < range.end) {
                        return new vscode.Range(position.line, range.start, position.line, range.end);
                    }
                }

                return new vscode.Range(position, position);
            },
        }),
    );

    // Bracket text objects
    const createBracketTextObject = (open: string, close: string, keys: string[], inner: boolean): TextObject => {
        return newTextObject({
            keys,
            compute: (context, position) => {
                let openLine: number | undefined;
                let openChar: number | undefined;
                let closeLine: number | undefined;
                let closeChar: number | undefined;
                let depth = 0;

                // Search backward for opening bracket/quote (across multiple lines)
                for (let line = position.line; line >= 0; line--) {
                    const lineText = context.document.lineAt(line).text;
                    const startChar = line === position.line ? position.character - 1 : lineText.length - 1;

                    for (let i = startChar; i >= 0; i--) {
                        if (lineText[i] === open) {
                            depth--;
                            if (depth < 0) {
                                openLine = line;
                                openChar = i;
                                break;
                            }
                        } else if (lineText[i] === close) {
                            depth++;
                        }
                    }

                    if (openLine !== undefined) {
                        break;
                    }
                }

                if (openLine === undefined || openChar === undefined) {
                    return new vscode.Range(position, position);
                }

                // Search forward for closing bracket/quote (across multiple lines)
                depth = 0;
                for (let line = position.line; line < context.document.lineCount; line++) {
                    const lineText = context.document.lineAt(line).text;
                    const startChar = line === position.line ? position.character : 0;

                    for (let i = startChar; i < lineText.length; i++) {
                        if (lineText[i] === close) {
                            depth--;
                            if (depth < 0) {
                                closeLine = line;
                                closeChar = i;
                                break;
                            }
                        } else if (lineText[i] === open) {
                            depth++;
                        }
                    }

                    if (closeLine !== undefined) {
                        break;
                    }
                }

                if (closeLine === undefined || closeChar === undefined) {
                    return new vscode.Range(position, position);
                }

                if (inner) {
                    // Inner: exclude brackets/quotes
                    const startPos =
                        openChar === context.document.lineAt(openLine).text.length - 1 && openLine < closeLine
                            ? new vscode.Position(openLine + 1, 0)
                            : new vscode.Position(openLine, openChar + 1);
                    const endPos = new vscode.Position(closeLine, closeChar);
                    return new vscode.Range(startPos, endPos);
                } else {
                    // Around: include brackets/quotes
                    const startPos = new vscode.Position(openLine, openChar);
                    const endPos =
                        closeChar === context.document.lineAt(closeLine).text.length - 1 &&
                        closeLine < context.document.lineCount - 1
                            ? new vscode.Position(closeLine + 1, 0)
                            : new vscode.Position(closeLine, closeChar + 1);
                    return new vscode.Range(startPos, endPos);
                }
            },
        });
    };

    // Bracket and brace text objects
    textObjects.push(
        // Parentheses
        createBracketTextObject('(', ')', ['i', '('], true), // inner parentheses
        createBracketTextObject('(', ')', ['a', '('], false), // around parentheses
        createBracketTextObject('(', ')', ['i', 'b'], true), // inner bracket (alias)
        createBracketTextObject('(', ')', ['a', 'b'], false), // around bracket (alias)

        // Braces
        createBracketTextObject('{', '}', ['i', '{'], true), // inner braces
        createBracketTextObject('{', '}', ['a', '{'], false), // around braces
        createBracketTextObject('{', '}', ['i', 'B'], true), // inner brace (alias)
        createBracketTextObject('{', '}', ['a', 'B'], false), // around brace (alias)

        // Square brackets
        createBracketTextObject('[', ']', ['i', '['], true), // inner square brackets
        createBracketTextObject('[', ']', ['a', '['], false), // around square brackets
        createBracketTextObject('[', ']', ['i', ']'], true), // inner square brackets (alias)
        createBracketTextObject('[', ']', ['a', ']'], false), // around square brackets (alias)

        // Angle brackets
        createBracketTextObject('<', '>', ['i', '<'], true), // inner angle brackets
        createBracketTextObject('<', '>', ['a', '<'], false), // around angle brackets
        createBracketTextObject('<', '>', ['i', '>'], true), // inner angle brackets (alias)
        createBracketTextObject('<', '>', ['a', '>'], false), // around angle brackets (alias)
    );

    // Quote text objects (using the same bracket logic)
    textObjects.push(
        // Double quotes
        createBracketTextObject('"', '"', ['i', '"'], true), // inner double quotes
        createBracketTextObject('"', '"', ['a', '"'], false), // around double quotes

        // Single quotes
        createBracketTextObject("'", "'", ['i', "'"], true), // inner single quotes
        createBracketTextObject("'", "'", ['a', "'"], false), // around single quotes

        // Backticks
        createBracketTextObject('`', '`', ['i', '`'], true), // inner backticks
        createBracketTextObject('`', '`', ['a', '`'], false), // around backticks
    );

    return textObjects;
}
