import type { Context } from '../../context';
import { delegateAction } from '../actions';
import { newAction } from '../actionBuilder';
import type { Action } from '../actionTypes';

/**
 * クリップボード操作アクション (Cmd+C/X/Vのオーバーライド)
 */
export function buildClipboardActions(): Action[] {
    const actions: Action[] = [];

    // Cmd+C - Normal mode: 行全体をyank (yy相当)
    actions.push(
        newAction({
            keys: ['<D-c>'],
            modes: ['normal'],
            execute: async (context: Context) => {
                await delegateAction(context.vimState.actions, context, ['y', 'y']);
            },
        }),
    );

    // Cmd+C - Visual/VisualLine mode: 選択範囲をyank (y相当)
    actions.push(
        newAction({
            keys: ['<D-c>'],
            modes: ['visual', 'visualLine'],
            execute: async (context: Context) => {
                await delegateAction(context.vimState.actions, context, ['y']);
            },
        }),
    );

    // Cmd+X - Normal mode: 行全体をカット (dd相当)
    actions.push(
        newAction({
            keys: ['<D-x>'],
            modes: ['normal'],
            execute: async (context: Context) => {
                await delegateAction(context.vimState.actions, context, ['d', 'd']);
            },
        }),
    );

    // Cmd+X - Visual/VisualLine mode: 選択範囲をカット (d相当)
    actions.push(
        newAction({
            keys: ['<D-x>'],
            modes: ['visual', 'visualLine'],
            execute: async (context: Context) => {
                await delegateAction(context.vimState.actions, context, ['d']);
            },
        }),
    );

    // Cmd+V - Normal/Visual/VisualLine mode: ペースト (p相当)
    actions.push(
        newAction({
            keys: ['<D-v>'],
            modes: ['normal', 'visual', 'visualLine'],
            execute: async (context: Context) => {
                await delegateAction(context.vimState.actions, context, ['p']);
            },
        }),
    );

    return actions;
}
