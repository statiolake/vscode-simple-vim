import type { Context } from '../../context';
import { enterMode } from '../../modes';
import { newWholeLineTextObject } from '../../textObject/textObjectBuilder';
import type { TextObject } from '../../textObject/textObjectTypes';
import { expandSelectionsToNextLineStart } from '../../utils/visualLine';
import { newAction, newOperatorAction } from '../actionBuilder';
import type { Action, ActionResult } from '../actionTypes';

/**
 * オペレータアクション (d, y, c)
 */
export function buildOperatorActions(
    textObjects: TextObject[],
    delegateAction: (actions: Action[], context: Context, keys: string[]) => Promise<ActionResult>,
): Action[] {
    const actions: Action[] = [];

    // Normal モード
    actions.push(
        // d - 削除
        newOperatorAction({
            operatorKeys: ['d'],
            modes: ['normal'],
            textObjects: [newWholeLineTextObject({ keys: ['d'], includeLineBreak: true }), ...textObjects],
            execute: async (context, matches) => {
                if (matches.length === 0) return;

                context.vimState.register.contents = matches.map((match) => ({
                    text: context.document.getText(match.range),
                    isLinewise: match.isLinewise ?? false,
                }));

                await context.editor.edit((editBuilder) => {
                    for (const match of matches) {
                        editBuilder.delete(match.range);
                    }
                });
            },
        }),
        newAction({
            keys: ['D'],
            modes: ['normal'],
            execute: async (context) => {
                await delegateAction(actions, context, ['d', '$']);
            },
        }),

        // y - ヤンク
        newOperatorAction({
            operatorKeys: ['y'],
            modes: ['normal'],
            textObjects: [newWholeLineTextObject({ keys: ['y'], includeLineBreak: true }), ...textObjects],
            execute: async (context, matches) => {
                if (matches.length === 0) return;

                context.vimState.register.contents = matches.map((match) => ({
                    text: context.document.getText(match.range),
                    isLinewise: match.isLinewise ?? false,
                }));
            },
        }),
        newAction({
            keys: ['Y'],
            modes: ['normal'],
            execute: async (context) => {
                await delegateAction(actions, context, ['y', 'y']);
            },
        }),

        // c - 変更
        newOperatorAction({
            operatorKeys: ['c'],
            modes: ['normal'],
            textObjects: [newWholeLineTextObject({ keys: ['c'], includeLineBreak: false }), ...textObjects],
            execute: async (context, matches) => {
                if (matches.length === 0) return;

                context.vimState.register.contents = matches.map((match) => ({
                    text: context.document.getText(match.range),
                    isLinewise: match.isLinewise ?? false,
                }));

                await context.editor.edit((editBuilder) => {
                    for (const match of matches) {
                        editBuilder.delete(match.range);
                    }
                });
                await enterMode(context.vimState, context.editor, 'insert');
            },
        }),
        newAction({
            keys: ['C'],
            modes: ['normal'],
            execute: async (context) => {
                await delegateAction(actions, context, ['c', '$']);
            },
        }),

        // s, S - 変更のエイリアス
        newAction({
            keys: ['s'],
            modes: ['normal'],
            execute: async (context) => {
                await delegateAction(actions, context, ['c', 'l']);
            },
        }),
        newAction({
            keys: ['S'],
            modes: ['normal'],
            execute: async (context) => {
                await delegateAction(actions, context, ['c', 'c']);
            },
        }),
    );

    // Visual モード
    actions.push(
        // d - 削除
        newAction({
            keys: ['d'],
            modes: ['visual', 'visualLine'],
            execute: async (context) => {
                if (context.vimState.mode === 'visualLine') {
                    // Visual Line モードは行末までしか選択しないので改行が含まれず、直接追加する必要がある
                    expandSelectionsToNextLineStart(context.editor);
                }
                context.vimState.register.contents = context.editor.selections.map((selection) => ({
                    text: context.document.getText(selection),
                    isLinewise: context.vimState.mode === 'visualLine',
                }));

                await context.editor.edit((editBuilder) => {
                    for (const selection of context.editor.selections) {
                        editBuilder.delete(selection);
                    }
                });

                enterMode(context.vimState, context.editor, 'normal');
            },
        }),

        // y - ヤンク
        newAction({
            keys: ['y'],
            modes: ['visual', 'visualLine'],
            execute: async (context) => {
                if (context.vimState.mode === 'visualLine') {
                    // Visual Line モードは行末までしか選択しないので改行が含まれず、直接追加する必要がある
                    expandSelectionsToNextLineStart(context.editor);
                }
                context.vimState.register.contents = context.editor.selections.map((selection) => ({
                    text: context.document.getText(selection),
                    isLinewise: context.vimState.mode === 'visualLine',
                }));

                enterMode(context.vimState, context.editor, 'normal');
            },
        }),

        // c - 変更
        newAction({
            keys: ['c'],
            modes: ['visual', 'visualLine'],
            execute: async (context) => {
                if (context.vimState.mode === 'visualLine') {
                    // Visual Line モードは行末までしか選択しないので改行が含まれず、直接追加する必要がある
                    expandSelectionsToNextLineStart(context.editor);
                }
                context.vimState.register.contents = context.editor.selections.map((selection) => ({
                    text: context.document.getText(selection),
                    isLinewise: context.vimState.mode === 'visualLine',
                }));

                await context.editor.edit((editBuilder) => {
                    for (const selection of context.editor.selections) {
                        editBuilder.delete(selection);
                    }
                });
                enterMode(context.vimState, context.editor, 'insert');
            },
        }),

        // s - 変更のエイリアス
        newAction({
            keys: ['s'],
            modes: ['visual', 'visualLine'],
            execute: async (context) => {
                await delegateAction(actions, context, ['c']);
            },
        }),
    );

    return actions;
}
