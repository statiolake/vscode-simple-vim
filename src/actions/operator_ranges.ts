import * as vscode from 'vscode';
import { arrayFindLast } from '../array_utils';
import { isVscodeNativeCursor } from '../config';
import { indentLevelRange } from '../indent_utils';
import { paragraphBackward, paragraphForward, paragraphRangeInner, paragraphRangeOuter } from '../paragraph_utils';
import { createOperatorRangeExactKeys, createOperatorRangeRegex } from '../parse_keys';
import type { OperatorRange } from '../parse_keys_types';
import * as positionUtils from '../position_utils';
import { findQuoteRange, quoteRanges } from '../quote_utils';
import { searchBackwardBracket, searchForwardBracket } from '../search_utils';
import { getTags } from '../tag_utils';
import type { VimState } from '../vim_state_types';
import { whitespaceWordRanges, wordRanges } from '../word_utils';

export const operatorRanges: OperatorRange[] = [
    createOperatorRangeExactKeys(['l'], false, (_vimState, document, position) => {
        const right = positionUtils.right(document, position);

        if (right.isEqual(position)) {
            return undefined;
        } else {
            return new vscode.Range(position, right);
        }
    }),
    createOperatorRangeExactKeys(['h'], false, (_vimState, _document, position) => {
        const left = positionUtils.left(position);

        if (left.isEqual(position)) {
            return undefined;
        } else {
            return new vscode.Range(position, left);
        }
    }),
    createOperatorRangeExactKeys(['k'], true, (_vimState, document, position) => {
        if (position.line === 0) {
            return new vscode.Range(new vscode.Position(0, 0), positionUtils.lineEnd(document, position));
        } else {
            return new vscode.Range(
                new vscode.Position(position.line - 1, 0),
                positionUtils.lineEnd(document, position),
            );
        }
    }),

    createOperatorRangeExactKeys(['j'], true, (_vimState, document, position) => {
        if (position.line === document.lineCount - 1) {
            return new vscode.Range(new vscode.Position(position.line, 0), positionUtils.lineEnd(document, position));
        } else {
            return new vscode.Range(
                new vscode.Position(position.line, 0),
                positionUtils.lineEnd(document, position.with({ line: position.line + 1 })),
            );
        }
    }),

    createOperatorRangeExactKeys(['w'], false, createWordForwardHandler(wordRanges)),
    createOperatorRangeExactKeys(['W'], false, createWordForwardHandler(whitespaceWordRanges)),

    createOperatorRangeExactKeys(['b'], false, createWordBackwardHandler(wordRanges)),
    createOperatorRangeExactKeys(['B'], false, createWordBackwardHandler(whitespaceWordRanges)),

    createOperatorRangeExactKeys(['e'], false, createWordEndHandler(wordRanges)),
    createOperatorRangeExactKeys(['E'], false, createWordEndHandler(whitespaceWordRanges)),

    createOperatorRangeExactKeys(['g', 'e'], false, createWordEndBackwardHandler(wordRanges)),
    createOperatorRangeExactKeys(['g', 'E'], false, createWordEndBackwardHandler(whitespaceWordRanges)),

    createOperatorRangeExactKeys(['i', 'w'], false, createInnerWordHandler(wordRanges)),
    createOperatorRangeExactKeys(['i', 'W'], false, createInnerWordHandler(whitespaceWordRanges)),

    createOperatorRangeExactKeys(['a', 'w'], false, createOuterWordHandler(wordRanges)),
    createOperatorRangeExactKeys(['a', 'W'], false, createOuterWordHandler(whitespaceWordRanges)),

    createOperatorRangeRegex(/^f(.)$/, /^f$/, false, (_vimState, document, position, match) => {
        const lineText = document.lineAt(position.line).text;
        const result = lineText.indexOf(match[1], position.character + 1);

        if (result >= 0) {
            // In vscode-native mode, range is from position to after the character (include the character)
            // In vim-traditional mode, range is from position to the character (include the character)
            if (isVscodeNativeCursor()) {
                return new vscode.Range(position, position.with({ character: result + 1 }));
            } else {
                return new vscode.Range(position, positionUtils.right(document, position.with({ character: result })));
            }
        } else {
            return undefined;
        }
    }),

    createOperatorRangeRegex(/^F(.)$/, /^F$/, false, (_vimState, document, position, match) => {
        const lineText = document.lineAt(position.line).text;
        const result = lineText.lastIndexOf(match[1], position.character - 1);

        if (result >= 0) {
            // In both modes, range is from the character position to current position (include the character)
            return new vscode.Range(position.with({ character: result }), position);
        } else {
            return undefined;
        }
    }),

    createOperatorRangeRegex(/^t(.)$/, /^t$/, false, (_vimState, document, position, match) => {
        const lineText = document.lineAt(position.line).text;
        const result = lineText.indexOf(match[1], position.character + 1);

        if (result >= 0) {
            // In vscode-native mode, range is from position to before the character
            // In vim-traditional mode, range is from position to before the character (same for both)
            // Note: for operators, the range should not include the target character
            return new vscode.Range(position, position.with({ character: result }));
        } else {
            return undefined;
        }
    }),

    createOperatorRangeRegex(/^T(.)$/, /^T$/, false, (_vimState, document, position, match) => {
        const lineText = document.lineAt(position.line).text;
        const result = lineText.lastIndexOf(match[1], position.character - 1);

        if (result >= 0) {
            const newPosition = positionUtils.right(document, position.with({ character: result }));
            return new vscode.Range(newPosition, position);
        } else {
            return undefined;
        }
    }),

    createOperatorRangeExactKeys(['g', 'g'], true, (_vimState, document, position) => {
        const lineLength = document.lineAt(position.line).text.length;

        return new vscode.Range(new vscode.Position(0, 0), position.with({ character: lineLength }));
    }),

    createOperatorRangeExactKeys(['G'], true, (_vimState, document, position) => {
        const lineLength = document.lineAt(document.lineCount - 1).text.length;

        return new vscode.Range(
            position.with({ character: 0 }),
            new vscode.Position(document.lineCount - 1, lineLength),
        );
    }),

    // TODO: return undefined?
    createOperatorRangeExactKeys(['}'], true, (_vimState, document, position) => {
        return new vscode.Range(
            position.with({ character: 0 }),
            new vscode.Position(paragraphForward(document, position.line), 0),
        );
    }),

    // TODO: return undefined?
    createOperatorRangeExactKeys(['{'], true, (_vimState, document, position) => {
        return new vscode.Range(
            new vscode.Position(paragraphBackward(document, position.line), 0),
            position.with({ character: 0 }),
        );
    }),

    createOperatorRangeExactKeys(['i', 'p'], true, (_vimState, document, position) => {
        const result = paragraphRangeInner(document, position.line);

        if (result) {
            return new vscode.Range(
                new vscode.Position(result.start, 0),
                new vscode.Position(result.end, document.lineAt(result.end).text.length),
            );
        } else {
            return undefined;
        }
    }),

    createOperatorRangeExactKeys(['a', 'p'], true, (_vimState, document, position) => {
        const result = paragraphRangeOuter(document, position.line);

        if (result) {
            return new vscode.Range(
                new vscode.Position(result.start, 0),
                new vscode.Position(result.end, document.lineAt(result.end).text.length),
            );
        } else {
            return undefined;
        }
    }),

    createOperatorRangeExactKeys(['i', "'"], false, createInnerQuoteHandler("'")),
    createOperatorRangeExactKeys(['a', "'"], false, createOuterQuoteHandler("'")),

    createOperatorRangeExactKeys(['i', '"'], false, createInnerQuoteHandler('"')),
    createOperatorRangeExactKeys(['a', '"'], false, createOuterQuoteHandler('"')),

    createOperatorRangeExactKeys(['i', '`'], false, createInnerQuoteHandler('`')),
    createOperatorRangeExactKeys(['a', '`'], false, createOuterQuoteHandler('`')),

    createOperatorRangeExactKeys(['i', '('], false, createInnerBracketHandler('(', ')')),
    createOperatorRangeExactKeys(['a', '('], false, createOuterBracketHandler('(', ')')),

    createOperatorRangeExactKeys(['i', '{'], false, createInnerBracketHandler('{', '}')),
    createOperatorRangeExactKeys(['a', '{'], false, createOuterBracketHandler('{', '}')),

    createOperatorRangeExactKeys(['i', '['], false, createInnerBracketHandler('[', ']')),
    createOperatorRangeExactKeys(['a', '['], false, createOuterBracketHandler('[', ']')),

    createOperatorRangeExactKeys(['i', '<'], false, createInnerBracketHandler('<', '>')),
    createOperatorRangeExactKeys(['a', '<'], false, createOuterBracketHandler('<', '>')),

    createOperatorRangeExactKeys(['i', 't'], false, (_vimState, document, position) => {
        const tags = getTags(document);

        const closestTag = arrayFindLast(tags, (tag) => {
            if (tag.closing) {
                return position.isAfterOrEqual(tag.opening.start) && position.isBeforeOrEqual(tag.closing.end);
            } else {
                // Self-closing tags have no inside
                return false;
            }
        });

        if (closestTag) {
            if (closestTag.closing) {
                return new vscode.Range(
                    closestTag.opening.end.with({ character: closestTag.opening.end.character + 1 }),
                    closestTag.closing.start,
                );
            } else {
                throw new Error('We should have already filtered out self-closing tags above');
            }
        } else {
            return undefined;
        }
    }),

    createOperatorRangeExactKeys(['a', 't'], false, (_vimState, document, position) => {
        const tags = getTags(document);

        const closestTag = arrayFindLast(tags, (tag) => {
            const afterStart = position.isAfterOrEqual(tag.opening.start);

            if (tag.closing) {
                return afterStart && position.isBeforeOrEqual(tag.closing.end);
            } else {
                return afterStart && position.isBeforeOrEqual(tag.opening.end);
            }
        });

        if (closestTag) {
            if (closestTag.closing) {
                return new vscode.Range(
                    closestTag.opening.start,
                    closestTag.closing.end.with({ character: closestTag.closing.end.character + 1 }),
                );
            } else {
                return new vscode.Range(
                    closestTag.opening.start,
                    closestTag.opening.end.with({ character: closestTag.opening.end.character + 1 }),
                );
            }
        } else {
            return undefined;
        }
    }),

    // TODO: return undefined?
    createOperatorRangeExactKeys(['i', 'i'], true, (_vimState, document, position) => {
        const simpleRange = indentLevelRange(document, position.line);

        return new vscode.Range(
            new vscode.Position(simpleRange.start, 0),
            new vscode.Position(simpleRange.end, document.lineAt(simpleRange.end).text.length),
        );
    }),

    createOperatorRangeExactKeys(['0'], false, (_vimState, _document, position) => {
        if (position.character === 0) {
            return undefined;
        }
        return new vscode.Range(position.with({ character: 0 }), position);
    }),

    createOperatorRangeExactKeys(['^'], false, (_vimState, document, position) => {
        const line = document.lineAt(position.line);
        const firstNonWhitespace = line.firstNonWhitespaceCharacterIndex;
        if (position.character <= firstNonWhitespace) {
            return undefined;
        }
        return new vscode.Range(position.with({ character: firstNonWhitespace }), position);
    }),
];

export function createInnerBracketHandler(
    openingChar: string,
    closingChar: string,
): (vimState: VimState, document: vscode.TextDocument, position: vscode.Position) => vscode.Range | undefined {
    return (_vimState, document, position) => {
        const bracketRange = getBracketRange(document, position, openingChar, closingChar);

        if (bracketRange) {
            return new vscode.Range(
                bracketRange.start.with({ character: bracketRange.start.character + 1 }),
                bracketRange.end,
            );
        } else {
            return undefined;
        }
    };
}

export function createOuterBracketHandler(
    openingChar: string,
    closingChar: string,
): (vimState: VimState, document: vscode.TextDocument, position: vscode.Position) => vscode.Range | undefined {
    return (_vimState, document, position) => {
        const bracketRange = getBracketRange(document, position, openingChar, closingChar);

        if (bracketRange) {
            return new vscode.Range(
                bracketRange.start,
                bracketRange.end.with({ character: bracketRange.end.character + 1 }),
            );
        } else {
            return undefined;
        }
    };
}

function getBracketRange(
    document: vscode.TextDocument,
    position: vscode.Position,
    openingChar: string,
    closingChar: string,
): vscode.Range | undefined {
    const lineText = document.lineAt(position.line).text;
    const currentChar = lineText[position.character];

    let start: vscode.Position | undefined;
    let end: vscode.Position | undefined;
    if (currentChar === openingChar) {
        start = position;
        end = searchForwardBracket(document, openingChar, closingChar, positionUtils.rightWrap(document, position));
    } else if (currentChar === closingChar) {
        start = searchBackwardBracket(document, openingChar, closingChar, positionUtils.leftWrap(document, position));
        end = position;
    } else {
        start = searchBackwardBracket(document, openingChar, closingChar, position);
        end = searchForwardBracket(document, openingChar, closingChar, position);
    }

    if (start && end) {
        return new vscode.Range(start, end);
    } else {
        return undefined;
    }
}

export function createInnerQuoteHandler(
    quoteChar: string,
): (vimState: VimState, document: vscode.TextDocument, position: vscode.Position) => vscode.Range | undefined {
    return (_vimState, document, position) => {
        const lineText = document.lineAt(position.line).text;
        const ranges = quoteRanges(quoteChar, lineText);
        const result = findQuoteRange(ranges, position);

        if (result) {
            return new vscode.Range(
                position.with({ character: result.start + 1 }),
                position.with({ character: result.end }),
            );
        } else {
            return undefined;
        }
    };
}

export function createOuterQuoteHandler(
    quoteChar: string,
): (vimState: VimState, document: vscode.TextDocument, position: vscode.Position) => vscode.Range | undefined {
    return (_vimState, document, position) => {
        const lineText = document.lineAt(position.line).text;
        const ranges = quoteRanges(quoteChar, lineText);
        const result = findQuoteRange(ranges, position);

        if (result) {
            return new vscode.Range(
                position.with({ character: result.start }),
                position.with({ character: result.end + 1 }),
            );
        } else {
            return undefined;
        }
    };
}

function createWordForwardHandler(
    wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: VimState, document: vscode.TextDocument, position: vscode.Position) => vscode.Range {
    return (_vimState, document, position) => {
        const lineText = document.lineAt(position.line).text;
        const ranges = wordRangesFunction(lineText);

        const result = ranges.find((x) => x.start > position.character);

        if (result) {
            return new vscode.Range(position, position.with({ character: result.start }));
        } else {
            return new vscode.Range(position, position.with({ character: lineText.length }));
        }
    };
}

function createWordBackwardHandler(
    wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: VimState, document: vscode.TextDocument, position: vscode.Position) => vscode.Range | undefined {
    return (_vimState, document, position) => {
        const lineText = document.lineAt(position.line).text;
        const ranges = wordRangesFunction(lineText);

        const result = ranges.reverse().find((x) => x.start < position.character);

        if (result) {
            return new vscode.Range(position.with({ character: result.start }), position);
        } else {
            return undefined;
        }
    };
}

function createWordEndHandler(
    wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: VimState, document: vscode.TextDocument, position: vscode.Position) => vscode.Range | undefined {
    return (_vimState, document, position) => {
        const lineText = document.lineAt(position.line).text;
        const ranges = wordRangesFunction(lineText);

        const result = ranges.find((x) => x.end > position.character);

        if (result) {
            // In vscode-native mode, range ends after the last character (result.end + 1)
            // In vim-traditional mode, range ends at the last character position
            if (isVscodeNativeCursor()) {
                return new vscode.Range(
                    position,
                    position.with({ character: Math.min(result.end + 1, lineText.length) }),
                );
            } else {
                return new vscode.Range(
                    position,
                    positionUtils.right(document, position.with({ character: result.end })),
                );
            }
        } else {
            return undefined;
        }
    };
}

function createWordEndBackwardHandler(
    wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: VimState, document: vscode.TextDocument, position: vscode.Position) => vscode.Range | undefined {
    return (_vimState, document, position) => {
        const lineText = document.lineAt(position.line).text;
        const ranges = wordRangesFunction(lineText);

        // Find the previous word end
        // In vscode-native mode: cursor is after character, so we need x.end + 1 < position.character
        // In vim-traditional mode: cursor is on character, so we need x.end < position.character
        let result: { start: number; end: number } | undefined;
        if (isVscodeNativeCursor()) {
            result = ranges.reverse().find((x) => x.end + 1 < position.character);
        } else {
            result = ranges.reverse().find((x) => x.end < position.character);
        }

        if (result) {
            // In vscode-native mode, range ends after the last character (result.end + 1)
            // In vim-traditional mode, range ends at the last character position
            if (isVscodeNativeCursor()) {
                return new vscode.Range(
                    position.with({ character: Math.min(result.end + 1, lineText.length) }),
                    position,
                );
            } else {
                return new vscode.Range(position.with({ character: result.end }), position);
            }
        } else {
            return undefined;
        }
    };
}

function createInnerWordHandler(
    wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: VimState, document: vscode.TextDocument, position: vscode.Position) => vscode.Range | undefined {
    return (_vimState, document, position) => {
        const lineText = document.lineAt(position.line).text;
        const ranges = wordRangesFunction(lineText);

        const result = ranges.find((x) => x.start <= position.character && position.character <= x.end);

        if (result) {
            return new vscode.Range(
                position.with({ character: result.start }),
                positionUtils.right(document, position.with({ character: result.end })),
            );
        } else {
            return undefined;
        }
    };
}

function createOuterWordHandler(
    wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: VimState, document: vscode.TextDocument, position: vscode.Position) => vscode.Range | undefined {
    return (_vimState, document, position) => {
        const lineText = document.lineAt(position.line).text;
        const ranges = wordRangesFunction(lineText);

        for (let i = 0; i < ranges.length; ++i) {
            const range = ranges[i];

            if (range.start <= position.character && position.character <= range.end) {
                if (i < ranges.length - 1) {
                    return new vscode.Range(
                        position.with({ character: range.start }),
                        position.with({ character: ranges[i + 1].start }),
                    );
                } else if (i > 0) {
                    return new vscode.Range(
                        positionUtils.right(document, position.with({ character: ranges[i - 1].end })),
                        positionUtils.right(document, position.with({ character: range.end })),
                    );
                } else {
                    return new vscode.Range(
                        position.with({ character: range.start }),
                        positionUtils.right(document, position.with({ character: range.end })),
                    );
                }
            }
        }

        return undefined;
    };
}
