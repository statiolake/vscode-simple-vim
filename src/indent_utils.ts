import type * as vscode from 'vscode';

import type { SimpleRange } from './simple_range_types';

export function indentLevelRange(document: vscode.TextDocument, lineNumber: number): SimpleRange {
    const indentLevel = findIndentLevel(document, lineNumber);
    const rangeStart = indentLevelRangeBefore(document, lineNumber, indentLevel);
    const rangeEnd = indentLevelRangeAfter(document, lineNumber + 1, indentLevel);

    if (rangeStart && rangeEnd) {
        return { start: rangeStart.start, end: rangeEnd.end };
    } else if (rangeStart) {
        return rangeStart;
    } else if (rangeEnd) {
        return rangeEnd;
    } else {
        // This will never happen but the typechecker can't know that
        return { start: lineNumber, end: lineNumber };
    }
}

function indentLevelRangeBefore(
    document: vscode.TextDocument,
    lineNumber: number,
    indentLevel: number,
): SimpleRange | undefined {
    let result: SimpleRange | undefined;

    for (let i = lineNumber; i >= 0; --i) {
        const line = document.lineAt(i);

        if (line.firstNonWhitespaceCharacterIndex >= indentLevel) {
            if (!line.isEmptyOrWhitespace) {
                if (result) {
                    result.start = i;
                } else {
                    result = { start: i, end: i };
                }
            }
        } else {
            if (!line.isEmptyOrWhitespace) {
                return result;
            }
        }
    }

    return result;
}

function indentLevelRangeAfter(
    document: vscode.TextDocument,
    lineNumber: number,
    indentLevel: number,
): SimpleRange | undefined {
    let result: SimpleRange | undefined;

    for (let i = lineNumber; i < document.lineCount; ++i) {
        const line = document.lineAt(i);

        if (line.firstNonWhitespaceCharacterIndex >= indentLevel) {
            if (!line.isEmptyOrWhitespace) {
                if (result) {
                    result.end = i;
                } else {
                    result = { start: i, end: i };
                }
            }
        } else {
            if (!line.isEmptyOrWhitespace) {
                return result;
            }
        }
    }

    return result;
}

function findIndentLevel(document: vscode.TextDocument, lineNumber: number) {
    const line = document.lineAt(lineNumber);

    if (!line.isEmptyOrWhitespace) {
        return line.firstNonWhitespaceCharacterIndex;
    }

    return Math.max(
        findIndentLevelForward(document, lineNumber + 1),
        findIndentLevelBackward(document, lineNumber - 1),
    );
}

function findIndentLevelForward(document: vscode.TextDocument, lineNumber: number): number {
    for (let i = lineNumber; i < document.lineCount; ++i) {
        const line = document.lineAt(i);

        if (!line.isEmptyOrWhitespace) {
            return line.firstNonWhitespaceCharacterIndex;
        }
    }

    return 0;
}

function findIndentLevelBackward(document: vscode.TextDocument, lineNumber: number): number {
    for (let i = lineNumber; i >= 0; --i) {
        const line = document.lineAt(i);

        if (!line.isEmptyOrWhitespace) {
            return line.firstNonWhitespaceCharacterIndex;
        }
    }

    return 0;
}
