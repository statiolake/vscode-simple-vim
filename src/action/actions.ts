import type { Context } from '../context';
import { buildMotions } from '../motion/motions';
import { buildTextObjects } from '../textObject/textObjects';
import { motionToAction, textObjectToVisualAction } from './actionBuilder';
import type { Action, ActionResult } from './actionTypes';
import { buildClipboardActions } from './defs/clipboard';
import { buildCustomActions } from './defs/custom';
import { buildEditActions } from './defs/edit';
import { buildLspActions } from './defs/lsp';
import { buildMiscActions } from './defs/misc';
import { buildModeActions } from './defs/mode';
import { buildMulticursorActions } from './defs/multicursor';
import { buildOperatorActions } from './defs/operator';
import { createYsSurroundAction, csSurroundAction, dsSurroundAction, visualSurroundAction } from './defs/surround';
import { buildViewportActions } from './defs/viewport';

export function buildActions(): Action[] {
    const actions: Action[] = [];

    // Motion actions - すべてのmotionをNormal, Visual, VisualLineで使用可能にする
    const motions = buildMotions();
    console.log(`Building ${motions.length} motion actions`);
    actions.push(...motions.map((action) => motionToAction(action)));

    // TextObjects を構築
    const textObjects = buildTextObjects(motions);

    // ビジュアルモードで選択範囲をテキストオブジェクトで指定するやつ。 viw など。一見 v + iw というオペレータに見える
    // が、v 自体がビジュアルモードに切り替えるコマンドなのでこれはできない。代わりに visual mode での iw コマンドとして
    // 振る舞う。
    actions.push(...textObjects.map((obj) => textObjectToVisualAction(obj)));

    // 各種アクションを追加
    console.log('Building mode actions');
    actions.push(...buildModeActions());

    console.log('Building edit actions');
    actions.push(...buildEditActions());

    console.log('Building misc actions');
    actions.push(...buildMiscActions());

    console.log('Building LSP actions');
    actions.push(...buildLspActions());

    console.log('Building multicursor actions');
    actions.push(...buildMulticursorActions());

    console.log('Building viewport actions');
    actions.push(...buildViewportActions());

    console.log('Building clipboard actions');
    actions.push(...buildClipboardActions());

    // オペレータアクション
    console.log(`Building operator actions with ${textObjects.length} text objects`);
    actions.push(...buildOperatorActions(textObjects, delegateAction));

    // Surround actions
    console.log('Building surround actions');
    actions.push(createYsSurroundAction(textObjects), dsSurroundAction, csSurroundAction, visualSurroundAction);

    // カスタムバインディング
    console.log('Building custom bindings');
    actions.push(...buildCustomActions());

    console.log(`Built ${actions.length} total actions`);
    return actions;
}

export async function delegateAction(actions: Action[], context: Context, keys: string[]): Promise<ActionResult> {
    let finalResult: 'noMatch' | 'needsMoreKey' = 'noMatch';
    for (const action of actions) {
        const result = await action(context, keys);
        if (result === 'executed') {
            return 'executed';
        } else if (result === 'needsMoreKey') {
            finalResult = 'needsMoreKey';
        }
    }

    return finalResult;
}
