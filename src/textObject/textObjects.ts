import { Range } from 'vscode';
import type { Motion } from '../motion/motionTypes';
import { findAdjacentPosition, findInsideBalancedPairs, findWordBoundary } from '../utils/positionFinder';
import { isCharacterTypeBoundary, isWhitespaceBoundary } from '../utils/unicode';
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
        let range: Range;

        if (targetPosition.isBefore(position)) {
            range = new Range(targetPosition, position);
        } else {
            range = new Range(position, targetPosition);
        }

        // Motion から remainingKeys を取得
        const remainingKeys = motionResult.remainingKeys;

        return { result: 'match', data: { range }, remainingKeys };
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
                const { document } = context;
                const start = findWordBoundary(document, 'further', 'before', position, isCharacterTypeBoundary);
                const end = findWordBoundary(document, 'further', 'after', position, isCharacterTypeBoundary);

                if (start && end) {
                    return new Range(start, end);
                }

                return new Range(position, position);
            },
        }),

        newTextObject({
            keys: ['a', 'w'],
            compute: (context, position) => {
                const { document } = context;
                const start = findWordBoundary(document, 'further', 'before', position, isCharacterTypeBoundary);
                const end = findWordBoundary(document, 'further', 'after', position, isCharacterTypeBoundary);

                if (start && end) {
                    return new Range(start, end);
                }

                return new Range(position, position);
            },
        }),

        newTextObject({
            keys: ['i', 'W'],
            compute: (context, position) => {
                const { document } = context;
                const start = findWordBoundary(document, 'further', 'before', position, isWhitespaceBoundary);
                const end = findWordBoundary(document, 'further', 'after', position, isWhitespaceBoundary);

                if (start && end) {
                    return new Range(start, end);
                }

                return new Range(position, position);
            },
        }),

        newTextObject({
            keys: ['a', 'W'],
            compute: (context, position) => {
                const { document } = context;
                const start = findWordBoundary(document, 'further', 'before', position, isWhitespaceBoundary);
                const end = findWordBoundary(document, 'further', 'after', position, isWhitespaceBoundary);

                if (start && end) {
                    return new Range(start, end);
                }

                return new Range(position, position);
            },
        }),
    );

    // 括弧テキストオブジェクト
    const createBracketTextObject = (open: string, close: string, keys: string[], inner: boolean): TextObject => {
        const baseTextObject = newTextObject({
            keys,
            compute: (context, position) => {
                const range = findInsideBalancedPairs(context.document, position, open, close);
                if (!range) return new Range(position, position);

                if (inner) {
                    // 内部: 括弧/クォート自体は含まない
                    return range;
                } else {
                    // 周辺: 括弧/クォート自体を含む
                    const startPos = findAdjacentPosition(context.document, 'before', range.start);
                    const endPos = findAdjacentPosition(context.document, 'after', range.end);
                    return new Range(startPos, endPos);
                }
            },
        });

        return baseTextObject;
    };

    // 括弧とブレースのテキストオブジェクト
    textObjects.push(
        // 括弧
        createBracketTextObject('(', ')', ['i', '('], true), // 内部括弧
        createBracketTextObject('(', ')', ['a', '('], false), // 周辺括弧
        createBracketTextObject('(', ')', ['i', 'b'], true), // 内部括弧（エイリアス）
        createBracketTextObject('(', ')', ['a', 'b'], false), // 周辺括弧（エイリアス）

        // ブレース
        createBracketTextObject('{', '}', ['i', '{'], true), // 内部ブレース
        createBracketTextObject('{', '}', ['a', '{'], false), // 周辺ブレース
        createBracketTextObject('{', '}', ['i', 'B'], true), // 内部ブレース（エイリアス）
        createBracketTextObject('{', '}', ['a', 'B'], false), // 周辺ブレース（エイリアス）

        // 角括弧
        createBracketTextObject('[', ']', ['i', '['], true), // 内部角括弧
        createBracketTextObject('[', ']', ['a', '['], false), // 周辺角括弧
        createBracketTextObject('[', ']', ['i', ']'], true), // 内部角括弧（エイリアス）
        createBracketTextObject('[', ']', ['a', ']'], false), // 周辺角括弧（エイリアス）

        // 山括弧
        createBracketTextObject('<', '>', ['i', '<'], true), // 内部山括弧
        createBracketTextObject('<', '>', ['a', '<'], false), // 周辺山括弧
        createBracketTextObject('<', '>', ['i', '>'], true), // 内部山括弧（エイリアス）
        createBracketTextObject('<', '>', ['a', '>'], false), // 周辺山括弧（エイリアス）
    );

    // クォートのテキストオブジェクト
    textObjects.push(
        // ダブルクォート
        createBracketTextObject('"', '"', ['i', '"'], true), // 内部ダブルクォート
        createBracketTextObject('"', '"', ['a', '"'], false), // 周辺ダブルクォート

        // シングルクォート
        createBracketTextObject("'", "'", ['i', "'"], true), // 内部シングルクォート
        createBracketTextObject("'", "'", ['a', "'"], false), // 周辺シングルクォート

        // バッククォート
        createBracketTextObject('`', '`', ['i', '`'], true), // 内部バッククォート
        createBracketTextObject('`', '`', ['a', '`'], false), // 周辺バッククォート
    );

    return textObjects;
}
