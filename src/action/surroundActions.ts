import * as vscode from 'vscode';
import type { Context } from '../context';
import { enterMode } from '../modes';
import type { TextObject, TextObjectResult } from '../textObject/textObjectTypes';
import { findAdjacentPosition, findInsideBalancedPairs } from '../utils/positionFinder';
import { newRegexAction } from './actionBuilder';
import type { Action, ActionResult } from './actionTypes';

/**
 * 囲み文字のペアをマッピング
 * 開き括弧から閉じ括弧へのマッピング
 */
const surroundPairs: Record<string, { open: string; close: string }> = {
    '(': { open: '(', close: ')' },
    ')': { open: '(', close: ')' },
    b: { open: '(', close: ')' }, // alias for (
    '{': { open: '{', close: '}' },
    '}': { open: '{', close: '}' },
    B: { open: '{', close: '}' }, // alias for {
    '[': { open: '[', close: ']' },
    ']': { open: '[', close: ']' },
    '<': { open: '<', close: '>' },
    '>': { open: '<', close: '>' },
    '"': { open: '"', close: '"' },
    "'": { open: "'", close: "'" },
    '`': { open: '`', close: '`' },
};

/**
 * ys コマンド: 周囲に文字を追加
 * ys{motion}{char} で motion の範囲を char で囲む
 * 例: ysiw" → 単語をダブルクォートで囲む
 *
 * この実装は newOperatorAction() を参考にしつつも、
 * 追加の char 入力が必要なため直接実装
 */
export function createYsSurroundAction(textObjects: TextObject[]): Action {
    return async (context: Context, keys: string[]): Promise<ActionResult> => {
        // Normal モードのチェック
        if (context.vimState.mode !== 'normal') {
            return 'noMatch';
        }

        // ys で始まるかチェック
        if (keys.length === 0) return 'needsMoreKey';
        if (keys[0] !== 'y') return 'noMatch';
        if (keys.length === 1) return 'needsMoreKey';
        if (keys[1] !== 's') return 'noMatch';

        // ys の後のキーを取得
        const remainingKeys = keys.slice(2);
        if (remainingKeys.length === 0) {
            return 'needsMoreKey';
        }

        // 各 TextObject を試す
        for (const textObject of textObjects) {
            // 各カーソル位置で TextObject を実行
            // そのテキストオブジェクトが一カ所でもマッチしないのであれば次へ進む
            let matched = true;
            const results: Array<TextObjectResult & { result: 'match' }> = [];
            for (const selection of context.editor.selections) {
                const result = textObject(context, remainingKeys, selection.active);
                if (result.result === 'needsMoreKey') return 'needsMoreKey';
                if (result.result === 'noMatch') {
                    matched = false;
                    break;
                }

                results.push(result);
            }
            if (!matched) continue;

            // TextObject がマッチした
            // remainingKeys をチェック: 1文字だけ残っているはず（surroundChar）
            const afterMotionKeys = results[0].remainingKeys;

            // surroundChar がない場合は、まだキー入力が必要
            if (afterMotionKeys.length === 0) return 'needsMoreKey';

            // 残りの最初の1文字が surroundCharacter
            const surroundCharacter = afterMotionKeys[0];
            const pair = surroundPairs[surroundCharacter];

            // surroundCharacter が有効でない場合は、次の TextObject を試す
            if (!pair) continue;

            // surroundCharacter の後にさらにキーがある場合は無効
            if (afterMotionKeys.length > 1) continue;

            const { open, close } = pair;

            // 囲み文字を挿入
            await context.editor.edit((editBuilder) => {
                for (const result of results) {
                    const range = result.data.range;
                    // 終了位置の後に close を挿入
                    editBuilder.insert(range.end, close);
                    // 開始位置に open を挿入
                    editBuilder.insert(range.start, open);
                }
            });

            return 'executed';
        }

        return 'noMatch';
    };
}

/**
 * ds コマンド: 周囲の文字を削除
 * ds{char} で周囲の char を削除
 * 例: ds" → 周囲のダブルクォートを削除
 */
export const dsSurroundAction = newRegexAction({
    pattern: /^ds(?<char>.)$/,
    partial: /^ds(.{0,1})$/,
    modes: ['normal'],
    execute: async (context, variables) => {
        const char = variables.char;
        if (!char) return;

        const pair = surroundPairs[char];
        if (!pair) return;

        const { open, close } = pair;
        const editor = context.editor;
        const document = context.document;

        await editor.edit((editBuilder) => {
            for (const selection of editor.selections) {
                const range = findInsideBalancedPairs(document, selection.active, open, close);
                if (!range) continue;

                // findInsideBalancedPairs は内側の範囲を返す
                // 開き括弧は range.start の直前、閉じ括弧は range.end の直後

                // 開き括弧を削除
                const openStart = findAdjacentPosition(document, 'before', range.start);
                editBuilder.delete(new vscode.Range(openStart, range.start));

                // 閉じ括弧を削除
                const closeEnd = findAdjacentPosition(document, 'after', range.end);
                editBuilder.delete(new vscode.Range(range.end, closeEnd));
            }
        });
    },
});

/**
 * cs コマンド: 周囲の文字を変更
 * cs{old}{new} で周囲の old を new に変更
 * 例: cs"' → ダブルクォートをシングルクォートに変更
 */
export const csSurroundAction = newRegexAction({
    pattern: /^cs(?<old>.)(?<new>.)$/,
    partial: /^cs(.{0,2})$/,
    modes: ['normal'],
    execute: async (context, variables) => {
        const oldChar = variables.old;
        const newChar = variables.new;
        if (!oldChar || !newChar) return;

        const oldPair = surroundPairs[oldChar];
        const newPair = surroundPairs[newChar];
        if (!oldPair || !newPair) return;

        const editor = context.editor;
        const document = context.document;

        await editor.edit((editBuilder) => {
            for (const selection of editor.selections) {
                const range = findInsideBalancedPairs(document, selection.active, oldPair.open, oldPair.close);
                if (!range) continue;

                // findInsideBalancedPairs は内側の範囲を返す
                // 開き括弧は range.start の直前、閉じ括弧は range.end の直後

                // 開き括弧を置換
                const openStart = findAdjacentPosition(document, 'before', range.start);
                editBuilder.replace(new vscode.Range(openStart, range.start), newPair.open);

                // 閉じ括弧を置換
                const closeEnd = findAdjacentPosition(document, 'after', range.end);
                editBuilder.replace(new vscode.Range(range.end, closeEnd), newPair.close);
            }
        });
    },
});

/**
 * S コマンド (Visual モード): 選択範囲を囲む
 * S{char} で選択範囲を char で囲む
 * 例: viwS" → 選択された範囲をダブルクォートで囲む
 */
export const visualSurroundAction = newRegexAction({
    pattern: /^S(?<char>.)$/,
    partial: /^S(.{0,1})$/,
    modes: ['visual', 'visualLine'],
    execute: async (context, variables) => {
        const char = variables.char;
        if (!char) return;

        const pair = surroundPairs[char];
        if (!pair) return;

        const { open, close } = pair;
        const editor = context.editor;

        await editor.edit((editBuilder) => {
            for (const selection of editor.selections) {
                // 選択範囲の開始と終了を取得
                const start = selection.start;
                const end = selection.end;

                // 終了位置の前に close を挿入
                editBuilder.insert(end, close);
                // 開始位置に open を挿入
                editBuilder.insert(start, open);
            }
        });

        // Normal モードに戻る
        enterMode(context.vimState, context.editor, 'normal');
    },
});
