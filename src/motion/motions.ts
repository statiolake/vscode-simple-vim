import type { Position, Range } from 'vscode';
import * as vscode from 'vscode';
import type { Context } from '../context';
import {
    findAdjacentPosition,
    findDocumentEnd,
    findDocumentStart,
    findInsideBalancedPairs,
    findLineEnd,
    findLineStart,
    findLineStartAfterIndent,
    findNearerPosition,
    findParagraphBoundary,
    findWordBoundary,
} from '../utils/positionFinder';
import { isCharacterTypeBoundary, isWhitespaceBoundary } from '../utils/unicode';
import { newMotion, newRegexMotion } from './motionBuilder';
import type { Motion } from './motionTypes';

/**
 * ポジションを左に移動
 */
function positionLeft(position: vscode.Position): vscode.Position {
    if (position.character > 0) {
        return position.with({ character: position.character - 1 });
    }
    return position;
}

/**
 * ノーマルモード用の右移動（行末を超えない）
 */
function positionRightNormal(document: vscode.TextDocument, position: vscode.Position): vscode.Position {
    const lineLength = document.lineAt(position.line).text.length;
    if (position.character < lineLength) {
        return position.with({ character: position.character + 1 });
    }
    return position;
}

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
                return positionLeft(position);
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['l'],
            compute: (context, position) => {
                return positionRightNormal(context.document, position);
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
                const nextPos = findAdjacentPosition(context.document, 'after', position);
                const result = findWordBoundary(context.document, 'nearer', 'after', nextPos, isCharacterTypeBoundary);
                return result ?? position;
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['W'],
            compute: (context, position) => {
                const nextPos = findAdjacentPosition(context.document, 'after', position);
                const result = findWordBoundary(context.document, 'nearer', 'after', nextPos, isWhitespaceBoundary);
                return result ?? position;
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['b'],
            compute: (context, position) => {
                const nextPos = findAdjacentPosition(context.document, 'before', position);
                const result = findWordBoundary(
                    context.document,
                    'further',
                    'before',
                    nextPos,
                    isCharacterTypeBoundary,
                );
                return result ?? position;
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['B'],
            compute: (context, position) => {
                const nextPos = findAdjacentPosition(context.document, 'before', position);
                const result = findWordBoundary(context.document, 'further', 'before', nextPos, isWhitespaceBoundary);
                return result ?? position;
            },
        }),
    );

    motions.push(
        newMotion({
            keys: ['e'],
            compute: (context, position) => {
                const nextPos = findAdjacentPosition(context.document, 'after', position);
                const result = findWordBoundary(context.document, 'further', 'after', nextPos, isCharacterTypeBoundary);
                return result ?? position;
            },
        }),
    );

    // E motion: move to end of WORD (whitespace-separated)
    motions.push(
        newMotion({
            keys: ['E'],
            compute: (context, position) => {
                const nextPos = findAdjacentPosition(context.document, 'after', position);
                const result = findWordBoundary(context.document, 'further', 'after', nextPos, isWhitespaceBoundary);
                return result ?? position;
            },
        }),
    );

    // ge motion: move to end of previous word
    motions.push(
        newMotion({
            keys: ['g', 'e'],
            compute: (context, position) => {
                const nextPos = findAdjacentPosition(context.document, 'before', position);
                const result = findWordBoundary(context.document, 'nearer', 'before', nextPos, isCharacterTypeBoundary);
                return result ?? position;
            },
        }),
    );

    // gE motion: move to end of previous WORD (whitespace-separated)
    motions.push(
        newMotion({
            keys: ['g', 'E'],
            compute: (context, position) => {
                const nextPos = findAdjacentPosition(context.document, 'before', position);
                const result = findWordBoundary(context.document, 'nearer', 'before', nextPos, isWhitespaceBoundary);
                return result ?? position;
            },
        }),
    );

    // Navigation motions
    motions.push(
        newMotion({
            keys: ['g', 'g'],
            compute: (_context, _position) => findDocumentStart(_context.document),
        }),
    );

    motions.push(
        newMotion({
            keys: ['G'],
            compute: (context, _position) => findDocumentEnd(context.document),
        }),
    );

    motions.push(
        newMotion({
            keys: ['{'],
            compute: (context, position) => findParagraphBoundary(context.document, 'before', position),
        }),
    );

    motions.push(
        newMotion({
            keys: ['}'],
            compute: (context, position) => findParagraphBoundary(context.document, 'after', position),
        }),
    );

    // Line motions
    motions.push(
        newMotion({
            keys: ['$'],
            compute: (context, position) => findLineEnd(context.document, position),
        }),
    );

    motions.push(
        newMotion({
            keys: ['0'],
            compute: (_context, position) => findLineStart(_context.document, position),
        }),
    );

    motions.push(
        newMotion({
            keys: ['^'],
            compute: (context, position) => findLineStartAfterIndent(context.document, position),
        }),
    );

    motions.push(
        newMotion({
            keys: ['%'],
            compute: (context, position) => {
                const pairs: [string, string][] = [
                    ['(', ')'],
                    ['[', ']'],
                    ['{', '}'],
                ];

                const distance = (target: Position): number =>
                    Math.abs(context.document.offsetAt(target) - context.document.offsetAt(position));

                const minDistance = (target: Range): number => Math.min(distance(target.start), distance(target.end));

                // 各ペアで探索して、一番近いものを採用する
                let bestRange: vscode.Range | undefined;
                for (const [open, close] of pairs) {
                    const range = findInsideBalancedPairs(context.document, position, open, close);
                    if (!range) continue;

                    if (!bestRange || minDistance(range) < minDistance(bestRange)) {
                        bestRange = range;
                    }
                }
                if (!bestRange) return position;

                // 遠い方の位置に移動する
                return distance(bestRange.start) > distance(bestRange.end) ? bestRange.start : bestRange.end;
            },
        }),
    );

    const computeFtMotion = (
        context: Context,
        distance: 'nearer' | 'further',
        character: string,
        direction: 'after' | 'before',
        position: Position,
    ) => {
        const newPosition = findNearerPosition(context.document, (c) => c === character, direction, position, {
            withinLine: true,
        });
        if (!newPosition) return position;

        return distance === 'further' ? findAdjacentPosition(context.document, direction, newPosition) : newPosition;
    };

    motions.push(
        newRegexMotion({
            pattern: /^f(?<character>.)$/,
            partial: /^f$/,
            compute: (context, position, variables) => {
                context.vimState.lastFt = {
                    character: variables.character,
                    distance: 'further',
                    direction: 'after',
                };
                return computeFtMotion(context, 'further', variables.character, 'after', position);
            },
        }),
    );

    motions.push(
        newRegexMotion({
            pattern: /^F(?<character>.)$/,
            partial: /^F$/,
            compute: (context, position, variables) => {
                context.vimState.lastFt = {
                    character: variables.character,
                    distance: 'further',
                    direction: 'before',
                };
                return computeFtMotion(context, 'further', variables.character, 'before', position);
            },
        }),
    );

    motions.push(
        newRegexMotion({
            pattern: /^t(?<character>.)$/,
            partial: /^t$/,
            compute: (context, position, variables) => {
                context.vimState.lastFt = {
                    character: variables.character,
                    distance: 'nearer',
                    direction: 'after',
                };
                return computeFtMotion(context, 'nearer', variables.character, 'after', position);
            },
        }),
    );

    motions.push(
        newRegexMotion({
            pattern: /^T(?<character>.)$/,
            partial: /^T$/,
            compute: (context, position, variables) => {
                context.vimState.lastFt = {
                    character: variables.character,
                    distance: 'nearer',
                    direction: 'before',
                };
                return computeFtMotion(context, 'nearer', variables.character, 'before', position);
            },
        }),
    );

    // ; - 最後の f/F/t/T を繰り返す
    motions.push(
        newMotion({
            keys: [';'],
            compute: (context, position) => {
                const { lastFt } = context.vimState;
                if (!lastFt) return position;

                return computeFtMotion(context, lastFt.distance, lastFt.character, lastFt.direction, position);
            },
        }),
    );

    // , - 最後の f/F/t/T を逆方向に繰り返す
    motions.push(
        newMotion({
            keys: [','],
            compute: (context, position) => {
                const { lastFt } = context.vimState;
                if (!lastFt) return position;

                const reverseDirection = lastFt.direction === 'after' ? 'before' : 'after';
                return computeFtMotion(context, lastFt.distance, lastFt.character, reverseDirection, position);
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
