import type { Context } from '../context';
import type { VimState } from '../vimStateTypes';

/**
 * Actionの実行結果
 */
export type ActionResult = 'executed' | 'needsMoreKey' | 'noMatch';

/**
 * Action: (context, keys, vimState) => ActionResult
 *
 * キーを受け取り、パース・実行して結果を返す関数
 */
export type Action = (context: Context, keys: string[], vimState: VimState) => ActionResult;
