import type { Position, Range } from 'vscode';
import type { Context } from '../context';

/**
 * TextObjectMatch: TextObject マッチ結果の詳細情報
 */
export type TextObjectMatch = {
    range: Range;
    isLinewise?: boolean;
};

/**
 * TextObjectResult: TextObject実行の結果
 */
export type TextObjectResult =
    | { result: 'match'; data: TextObjectMatch; remainingKeys: string[] }
    | { result: 'needsMoreKey' }
    | { result: 'noMatch' };

/**
 * TextObject: (context, keys, position) => TextObjectResult
 *
 * キーシーケンスをパースして、マッチした場合は範囲とメタデータを返す
 */
export type TextObject = (context: Context, keys: string[], position: Position) => TextObjectResult;
