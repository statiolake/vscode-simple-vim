import * as vscode from 'vscode';
import type { Context } from '../context';
import { keysParserPrefix, keysParserRegex } from '../keysParser/keysParser';
import type { KeysParser } from '../keysParser/keysParserTypes';
import type { Mode } from '../modesTypes';
import type { Motion } from '../motionSystem/motionTypes';
import type { TextObject } from '../textObjectSystem/textObjectTypes';
import type { VimState } from '../vimStateTypes';
import type { Action, ActionResult } from './actionTypes';

/**
 * 内部ヘルパー: KeysParserとexecute関数からActionを作成
 */
function createAction(
    keysParser: KeysParser,
    modes: Mode[],
    execute: (context: Context, vimState: VimState, variables: Record<string, string>) => void,
): Action {
    return (context: Context, keys: string[], vimState: VimState): ActionResult => {
        // モードチェック
        if (!modes.includes(vimState.mode)) {
            return 'noMatch';
        }

        // キーパース
        const parseResult = keysParser(keys);

        if (parseResult.result === 'noMatch') {
            return 'noMatch';
        }

        if (parseResult.result === 'needsMoreKey') {
            return 'needsMoreKey';
        }

        // 実行 (variablesを渡す)
        execute(context, vimState, parseResult.variables);
        return 'executed';
    };
}

/**
 * 通常のActionを作成
 */
export function newAction(config: {
    keys: string[];
    modes: Mode[];
    execute: (context: Context, vimState: VimState) => void;
}): Action {
    const keysParser = keysParserPrefix(config.keys);
    return createAction(keysParser, config.modes, (context, vimState, _variables) => {
        config.execute(context, vimState);
    });
}

/**
 * 正規表現パターンを使うActionを作成
 */
export function newRegexAction(config: {
    pattern: RegExp;
    partial: RegExp;
    modes: Mode[];
    execute: (context: Context, vimState: VimState, variables: Record<string, string>) => void;
}): Action {
    const keysParser = keysParserRegex(config.pattern, config.partial);
    return createAction(keysParser, config.modes, config.execute);
}

/**
 * MotionをActionに変換
 * Motion自体がキーパースを行うため、単純に委譲する
 */
export function motionToAction(motion: Motion): Action {
    const modes = ['normal', 'visual', 'visualLine'];
    return (context: Context, keys: string[], vimState: VimState): ActionResult => {
        // モードチェック
        if (!modes.includes(vimState.mode)) {
            return 'noMatch';
        }

        // Motionを各カーソル位置で実行
        const results = context.editor.selections.map((selection) => {
            return motion(context, keys, selection.active);
        });

        // すべてのカーソルで同じ結果になるはず
        const firstResult = results[0];

        if (firstResult.result === 'noMatch') {
            return 'noMatch';
        }

        if (firstResult.result === 'needsMoreKey') {
            return 'needsMoreKey';
        }

        // すべてのカーソルを新しい位置に移動
        const newSelections = results.map((result, index) => {
            const currentSelection = context.editor.selections[index];

            if (result.result !== 'match') {
                return currentSelection;
            }

            if (vimState.mode === 'visual' || vimState.mode === 'visualLine') {
                // Visual モードでは選択範囲を拡張する
                return new vscode.Selection(currentSelection.anchor, result.position);
            } else {
                // Normal モードではカーソルが動く
                return new vscode.Selection(result.position, result.position);
            }
        });

        context.editor.selections = newSelections;
        context.editor.revealRange(
            new vscode.Range(newSelections[0].active, newSelections[0].active),
            vscode.TextEditorRevealType.Default,
        );

        return 'executed';
    };
}

/**
 * Operator + TextObject のActionを作成
 *
 * オペレーター(d, y, c)とTextObjectを組み合わせる
 * 例: dw, diw, d} (MotionはTextObjectに自動変換済み)
 */
export function newOperatorAction(config: {
    operatorKeys: string[];
    modes: Mode[];
    textObjects: TextObject[];
    execute: (context: Context, vimState: VimState, ranges: vscode.Range[]) => void;
}): Action {
    const operatorParser = keysParserPrefix(config.operatorKeys);

    return (context: Context, keys: string[], vimState: VimState): ActionResult => {
        // モードチェック
        if (!config.modes.includes(vimState.mode)) {
            return 'noMatch';
        }

        console.log(`Trying operator ${config.operatorKeys.join('')} with keys:`, keys);

        // オペレーターのパース
        const operatorResult = operatorParser(keys);

        if (operatorResult.result === 'noMatch') {
            return 'noMatch';
        }

        if (operatorResult.result === 'needsMoreKey') {
            return 'needsMoreKey';
        }

        // オペレーターがマッチした後のキー
        const remainingKeys = keys.slice(config.operatorKeys.length);

        console.log(
            `Operator ${config.operatorKeys.join('')} matched, original keys:`,
            keys,
            'operator length:',
            config.operatorKeys.length,
            'remaining keys:',
            remainingKeys,
        );

        if (remainingKeys.length === 0) {
            return 'needsMoreKey';
        }

        // 各TextObjectを試す
        for (const textObject of config.textObjects) {
            // 各カーソル位置でTextObjectを実行
            const results = context.editor.selections.map((selection) => {
                return textObject(context, remainingKeys, selection.active);
            });

            const firstResult = results[0];

            if (firstResult.result === 'noMatch') {
                continue; // 次のTextObjectを試す
            }

            if (firstResult.result === 'needsMoreKey') {
                return 'needsMoreKey';
            }

            console.log('TextObject matched with result:', firstResult.result);

            // Matchした - rangeを取得 (TextObjectは常にrangeを返す)
            const ranges = results.map((result, index) => {
                if (result.result === 'match') {
                    console.log(`TextObject result for cursor ${index}:`, result.range);
                    return result.range;
                }
                // This shouldn't happen
                const currentSelection = context.editor.selections[index];
                return new vscode.Range(currentSelection.active, currentSelection.active);
            });

            config.execute(context, vimState, ranges);
            return 'executed';
        }

        return 'noMatch';
    };
}
