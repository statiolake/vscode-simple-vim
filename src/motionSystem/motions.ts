import * as vscode from 'vscode';
import * as positionUtils from '../position_utils';
import { whitespaceWordRanges, wordRanges } from '../word_utils';
import { newMotion, newRegexMotion } from './motionBuilder';
import type { Motion } from './motionTypes';

/**
 * すべてのMotionを返す
 * VS Codeネイティブカーソル動作（文字と文字の間にカーソル）を使用
 */
export function buildMotions(): Motion[] {
    const motions: Motion[] = [];

    // Basic motions
    motions.push(
        newMotion({
            keys: ['h'],
            compute: (_context, position) => {
                return positionUtils.left(position);
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['l'],
            compute: (context, position) => {
                return positionUtils.rightNormal(context.document, position);
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['j'],
            compute: (context, position) => {
                if (position.line + 1 < context.document.lineCount) {
                    return new vscode.Position(position.line + 1, position.character);
                }
                return position;
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['k'],
            compute: (_context, position) => {
                if (position.line > 0) {
                    return new vscode.Position(position.line - 1, position.character);
                }
                return position;
            },
        }),
    );

    // Word motions
    motions.push(
        newMotion({
            keys: ['w'],
            compute: (context, position) => {
                const lineText = context.document.lineAt(position.line).text;
                const ranges = wordRanges(lineText);
                const result = ranges.find((x) => x.start > position.character);

                if (result) {
                    return position.with({ character: result.start });
                }

                if (position.line + 1 < context.document.lineCount) {
                    const nextLineText = context.document.lineAt(position.line + 1).text;
                    const nextRanges = wordRanges(nextLineText);
                    if (nextRanges.length > 0) {
                        return new vscode.Position(position.line + 1, nextRanges[0].start);
                    }
                }

                return position;
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['W'],
            compute: (context, position) => {
                const lineText = context.document.lineAt(position.line).text;
                const ranges = whitespaceWordRanges(lineText);
                const result = ranges.find((x) => x.start > position.character);

                if (result) {
                    return position.with({ character: result.start });
                }

                if (position.line + 1 < context.document.lineCount) {
                    const nextLineText = context.document.lineAt(position.line + 1).text;
                    const nextRanges = whitespaceWordRanges(nextLineText);
                    if (nextRanges.length > 0) {
                        return new vscode.Position(position.line + 1, nextRanges[0].start);
                    }
                }

                return position;
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['b'],
            compute: (context, position) => {
                const lineText = context.document.lineAt(position.line).text;
                const ranges = wordRanges(lineText);
                const result = ranges.reverse().find((x) => x.start < position.character);

                if (result) {
                    return position.with({ character: result.start });
                }

                if (position.line > 0) {
                    const prevLineText = context.document.lineAt(position.line - 1).text;
                    const prevRanges = wordRanges(prevLineText);
                    if (prevRanges.length > 0) {
                        return new vscode.Position(position.line - 1, prevRanges[prevRanges.length - 1].start);
                    }
                }

                return position;
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['B'],
            compute: (context, position) => {
                const lineText = context.document.lineAt(position.line).text;
                const ranges = whitespaceWordRanges(lineText);
                const result = ranges.reverse().find((x) => x.start < position.character);

                if (result) {
                    return position.with({ character: result.start });
                }

                if (position.line > 0) {
                    const prevLineText = context.document.lineAt(position.line - 1).text;
                    const prevRanges = whitespaceWordRanges(prevLineText);
                    if (prevRanges.length > 0) {
                        return new vscode.Position(position.line - 1, prevRanges[prevRanges.length - 1].start);
                    }
                }

                return position;
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['e'],
            compute: (context, position) => {
                const lineText = context.document.lineAt(position.line).text;
                const ranges = wordRanges(lineText);
                const result = ranges.find((x) => x.end > position.character);

                if (result) {
                    // VS Codeネイティブ：単語の終端（最後の文字の直後）に移動
                    return position.with({ character: result.end });
                }

                return position;
            },
        }),
    );

    // ge motion: move to end of previous word
    motions.push(
        newMotion({
            keys: ['g', 'e'],
            compute: (context, position) => {
                const lineText = context.document.lineAt(position.line).text;
                const ranges = wordRanges(lineText);

                // Find the word range that ends before current position
                const result = ranges.reverse().find((x) => x.end < position.character);

                if (result) {
                    // VS Codeネイティブ：単語の終端（最後の文字の直後）に移動
                    return position.with({ character: result.end });
                }

                // If no word found on current line, try previous line
                if (position.line > 0) {
                    const prevLineText = context.document.lineAt(position.line - 1).text;
                    const prevRanges = wordRanges(prevLineText);
                    if (prevRanges.length > 0) {
                        // Move to end of last word on previous line
                        const lastRange = prevRanges[prevRanges.length - 1];
                        return new vscode.Position(position.line - 1, lastRange.end);
                    }
                }

                return position;
            },
        }),
    );

    // gE motion: move to end of previous WORD (whitespace-separated)
    motions.push(
        newMotion({
            keys: ['g', 'E'],
            compute: (context, position) => {
                const lineText = context.document.lineAt(position.line).text;
                const ranges = whitespaceWordRanges(lineText);

                // Find the WORD range that ends before current position
                const result = ranges.reverse().find((x) => x.end < position.character);

                if (result) {
                    // VS Codeネイティブ：WORD の終端（最後の文字の直後）に移動
                    return position.with({ character: result.end });
                }

                // If no WORD found on current line, try previous line
                if (position.line > 0) {
                    const prevLineText = context.document.lineAt(position.line - 1).text;
                    const prevRanges = whitespaceWordRanges(prevLineText);
                    if (prevRanges.length > 0) {
                        // Move to end of last WORD on previous line
                        const lastRange = prevRanges[prevRanges.length - 1];
                        return new vscode.Position(position.line - 1, lastRange.end);
                    }
                }

                return position;
            },
        }),
    );

    // Navigation motions
    motions.push(
        newMotion({
            keys: ['g', 'g'],
            compute: (_context, _position) => {
                return new vscode.Position(0, 0);
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['G'],
            compute: (context, _position) => {
                const lastLine = context.document.lineCount - 1;
                return new vscode.Position(lastLine, 0);
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['{'],
            compute: (context, position) => {
                for (let line = position.line - 1; line >= 0; line--) {
                    const lineText = context.document.lineAt(line).text;
                    if (lineText.trim() === '') {
                        return new vscode.Position(line, 0);
                    }
                }
                return new vscode.Position(0, 0);
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['}'],
            compute: (context, position) => {
                for (let line = position.line + 1; line < context.document.lineCount; line++) {
                    const lineText = context.document.lineAt(line).text;
                    if (lineText.trim() === '') {
                        return new vscode.Position(line, 0);
                    }
                }
                return new vscode.Position(context.document.lineCount - 1, 0);
            },
        }),
    );

    // Line motions
    motions.push(
        newMotion({
            keys: ['$'],
            compute: (context, position) => {
                const lineLength = context.document.lineAt(position.line).text.length;
                // VS Codeネイティブ：行末（最後の文字の直後）に移動
                return position.with({ character: lineLength });
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['0'],
            compute: (_context, position) => {
                return position.with({ character: 0 });
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['^'],
            compute: (context, position) => {
                const firstNonWhitespace = context.document.lineAt(position.line).firstNonWhitespaceCharacterIndex;
                return position.with({ character: firstNonWhitespace });
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['_'],
            compute: (context, position) => {
                const firstNonWhitespace = context.document.lineAt(position.line).firstNonWhitespaceCharacterIndex;
                return position.with({ character: firstNonWhitespace });
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['%'],
            compute: (context, position) => {
                const pairs = ['()', '{}', '[]'];

                let offset = context.document.offsetAt(position);
                // 重すぎてもつらいので、とりあえず前後 1000 文字を探索する
                const minOffset = Math.max(0, offset - 1000);
                const maxOffset = Math.min(context.document.getText().length, offset + 1000);

                let dir: number = 1;
                let target: string | undefined;
                while (offset < maxOffset) {
                    const position = context.document.positionAt(offset);
                    const char = context.document.lineAt(position.line).text[position.character];

                    for (const pair of pairs) {
                        if (char === pair[0]) {
                            dir = 1;
                            target = pair[1];
                            break;
                        }

                        if (char === pair[1]) {
                            dir = -1;
                            target = pair[0];
                            break;
                        }
                    }

                    if (target) break;

                    offset++;
                }

                if (!target) {
                    return position;
                }

                while (minOffset < offset && offset < maxOffset) {
                    const position = context.document.positionAt(offset);
                    const char = context.document.lineAt(position.line).text[position.character];

                    if (char === target) {
                        return context.document.positionAt(Math.max(0, offset));
                    }

                    offset += dir;
                }

                return position;
            },
        }),
    );

    // Find motions - VS Codeネイティブカーソル動作

    // f: 現在位置から右方向に文字を検索し、文字の直後に移動
    const findForward = (lineText: string, startChar: number, char: string): number | undefined => {
        // startChar から検索を開始（現在位置から）
        // 繰り返し時は文字の直後にいるので、そこから次の同じ文字を探す
        for (let i = startChar; i < lineText.length; i++) {
            if (lineText[i] === char) {
                return i + 1; // VS Codeネイティブ：文字の直後の位置
            }
        }
        return undefined;
    };

    // F: 現在位置から左方向に文字を検索し、文字の位置に移動
    const findBackward = (lineText: string, startChar: number, char: string): number | undefined => {
        // startChar - 1 から検索を開始（現在位置の前から）
        // 繰り返し時は文字の位置にいるので、その前から次の同じ文字を探す
        for (let i = startChar - 1; i >= 0; i--) {
            if (lineText[i] === char) {
                return i; // VS Codeネイティブ：文字の位置
            }
        }
        return undefined;
    };

    // t: 現在位置から右方向に文字を検索し、文字の直前に移動
    const tillForward = (lineText: string, startChar: number, char: string): number | undefined => {
        // startChar + 1 から検索を開始（現在位置の次の文字から）
        for (let i = startChar + 1; i < lineText.length; i++) {
            if (lineText[i] === char) {
                return i; // VS Codeネイティブ：文字の直前の位置
            }
        }
        return undefined;
    };

    // T: 現在位置から左方向に文字を検索し、文字の直後に移動
    const tillBackward = (lineText: string, startChar: number, char: string): number | undefined => {
        // startChar - 2 から検索を開始（現在位置の前の文字から）
        for (let i = startChar - 2; i >= 0; i--) {
            if (lineText[i] === char) {
                return i + 1; // VS Codeネイティブ：文字の直後の位置
            }
        }
        return undefined;
    };

    motions.push(
        newRegexMotion({
            pattern: /^f(?<char>.)$/,
            partial: /^f$/,
            compute: (context, position, variables) => {
                const char = variables.char;
                const lineText = context.document.lineAt(position.line).text;
                const newChar = findForward(lineText, position.character, char);

                // VimState に保存
                context.vimState.lastFtChar = char;
                context.vimState.lastFtCommand = 'f';

                if (newChar !== undefined) {
                    return position.with({ character: newChar });
                }
                return position;
            },
        }),
    );

    motions.push(
        newRegexMotion({
            pattern: /^F(?<char>.)$/,
            partial: /^F$/,
            compute: (context, position, variables) => {
                const char = variables.char;
                const lineText = context.document.lineAt(position.line).text;
                const newChar = findBackward(lineText, position.character, char);

                // VimState に保存
                context.vimState.lastFtChar = char;
                context.vimState.lastFtCommand = 'F';

                if (newChar !== undefined) {
                    return position.with({ character: newChar });
                }
                return position;
            },
        }),
    );

    motions.push(
        newRegexMotion({
            pattern: /^t(?<char>.)$/,
            partial: /^t$/,
            compute: (context, position, variables) => {
                const char = variables.char;
                const lineText = context.document.lineAt(position.line).text;
                const newChar = tillForward(lineText, position.character, char);

                // VimState に保存
                context.vimState.lastFtChar = char;
                context.vimState.lastFtCommand = 't';

                if (newChar !== undefined) {
                    return position.with({ character: newChar });
                }
                return position;
            },
        }),
    );

    motions.push(
        newRegexMotion({
            pattern: /^T(?<char>.)$/,
            partial: /^T$/,
            compute: (context, position, variables) => {
                const char = variables.char;
                const lineText = context.document.lineAt(position.line).text;
                const newChar = tillBackward(lineText, position.character, char);

                // VimState に保存
                context.vimState.lastFtChar = char;
                context.vimState.lastFtCommand = 'T';

                if (newChar !== undefined) {
                    return position.with({ character: newChar });
                }
                return position;
            },
        }),
    );

    // ; - 最後の f/F/t/T を繰り返す
    motions.push(
        newMotion({
            keys: [';'],
            compute: (context, position) => {
                const lastCommand = context.vimState.lastFtCommand;
                const lastChar = context.vimState.lastFtChar;

                if (!lastCommand || !lastChar) {
                    return position;
                }

                const lineText = context.document.lineAt(position.line).text;
                let newChar: number | undefined;

                switch (lastCommand) {
                    case 'f':
                        newChar = findForward(lineText, position.character, lastChar);
                        break;
                    case 'F':
                        newChar = findBackward(lineText, position.character, lastChar);
                        break;
                    case 't':
                        newChar = tillForward(lineText, position.character, lastChar);
                        break;
                    case 'T':
                        newChar = tillBackward(lineText, position.character, lastChar);
                        break;
                }

                if (newChar !== undefined) {
                    return position.with({ character: newChar });
                }
                return position;
            },
        }),
    );

    // , - 最後の f/F/t/T を逆方向に繰り返す
    motions.push(
        newMotion({
            keys: [','],
            compute: (context, position) => {
                const lastCommand = context.vimState.lastFtCommand;
                const lastChar = context.vimState.lastFtChar;

                if (!lastCommand || !lastChar) {
                    return position;
                }

                const lineText = context.document.lineAt(position.line).text;
                let newChar: number | undefined;

                // 逆方向に実行
                switch (lastCommand) {
                    case 'f':
                        newChar = findBackward(lineText, position.character, lastChar);
                        break;
                    case 'F':
                        newChar = findForward(lineText, position.character, lastChar);
                        break;
                    case 't':
                        newChar = tillBackward(lineText, position.character, lastChar);
                        break;
                    case 'T':
                        newChar = tillForward(lineText, position.character, lastChar);
                        break;
                }

                if (newChar !== undefined) {
                    return position.with({ character: newChar });
                }
                return position;
            },
        }),
    );

    // <C-d> - 半ページ下へ移動
    motions.push(
        newMotion({
            keys: ['<C-d>'],
            compute: (context, position) => {
                const editor = context.editor;
                const visibleRanges = editor.visibleRanges;
                if (visibleRanges.length === 0) {
                    return position;
                }

                // 表示されている行数を計算
                const visibleLines = visibleRanges[0].end.line - visibleRanges[0].start.line;
                const halfPage = Math.floor(visibleLines / 2);

                // 新しい行位置を計算
                const newLine = Math.min(position.line + halfPage, context.document.lineCount - 1);
                return new vscode.Position(newLine, position.character);
            },
        }),
    );

    // <C-u> - 半ページ上へ移動
    motions.push(
        newMotion({
            keys: ['<C-u>'],
            compute: (context, position) => {
                const editor = context.editor;
                const visibleRanges = editor.visibleRanges;
                if (visibleRanges.length === 0) {
                    return position;
                }

                // 表示されている行数を計算
                const visibleLines = visibleRanges[0].end.line - visibleRanges[0].start.line;
                const halfPage = Math.floor(visibleLines / 2);

                // 新しい行位置を計算
                const newLine = Math.max(position.line - halfPage, 0);
                return new vscode.Position(newLine, position.character);
            },
        }),
    );

    return motions;
}
