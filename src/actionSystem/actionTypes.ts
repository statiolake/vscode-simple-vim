import type { Context } from '../context';

/**
 * Actionの実行結果
 */
export type ActionResult = 'executed' | 'needsMoreKey' | 'noMatch';

/**
 * Action: (context, keys) => ActionResult
 *
 * キーを受け取り、パース・実行して結果を返す関数
 * VimStateはcontext.vimStateからアクセス可能
 */
export type Action = (context: Context, keys: string[]) => ActionResult;
