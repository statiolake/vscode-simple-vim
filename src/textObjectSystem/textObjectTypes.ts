import type * as vscode from 'vscode';
import type { Context } from '../context';

/**
 * TextObjectResult: TextObject実行の結果
 */
export type TextObjectResult =
    | { result: 'match'; range: vscode.Range }
    | { result: 'needsMoreKey' }
    | { result: 'noMatch' };

/**
 * TextObject: (context, keys, position) => TextObjectResult
 *
 * キーシーケンスをパースして、マッチした場合は範囲を返す
 */
export type TextObject = (context: Context, keys: string[], position: vscode.Position) => TextObjectResult;
