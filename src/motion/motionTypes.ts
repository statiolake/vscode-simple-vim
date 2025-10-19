import type { Position } from 'vscode';
import type { Context } from '../context';

/**
 * MotionResult: Motion実行の結果
 */
export type MotionResult =
    | { result: 'match'; position: Position; remainingKeys: string[] }
    | { result: 'needsMoreKey' }
    | { result: 'noMatch' };

/**
 * Motion: (context, keys, position) => MotionResult
 *
 * キーシーケンスをパースして、マッチした場合は新しい位置を返す
 * Motionにmodeの概念はない
 */
export type Motion = (context: Context, keys: string[], position: Position) => MotionResult;
