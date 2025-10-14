import type * as vscode from 'vscode';
import type { Context } from '../context';

/**
 * MotionResult: Motion実行の結果
 */
export type MotionResult =
    | { result: 'match'; position: vscode.Position }
    | { result: 'needsMoreKey' }
    | { result: 'noMatch' };

/**
 * Motion: (context, keys, position) => MotionResult
 *
 * キーシーケンスをパースして、マッチした場合は新しい位置を返す
 * Motionにmodeの概念はない
 */
export type Motion = (context: Context, keys: string[], position: vscode.Position) => MotionResult;
