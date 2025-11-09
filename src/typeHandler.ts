import * as vscode from 'vscode';

import type { Context } from './context';
import { globalCommentConfigProvider } from './extension';
import type { VimState } from './vimState';

export async function typeHandler(vimState: VimState, char: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    // type が発生した場合に即行う処理はキューイング。後は Mutex が空くのを待ってから処理してくれればいいので、バックグ
    // ラウンドに投げるだけ投げてさっさと handler は終わってしまう。
    // ここで、少なくともタイプしたキーの数だけ Mutex を待っているタスクがある状態になるので、一回の Mutex 内で一文字以
    // 上 keysQueued を処理すれば、処理しきれずに止まってしまうことはない。
    vimState.keysQueued.push(char);
    console.log('queued char:', char);
    void vimState.actionMutex.use(async () => {
        if (vimState.mode === 'insert') {
            // 原則的には一文字ずつ処理するが、直前の動作で insert mode に入った場合、Pending しているすべてのキー入力を
            // 一文字ずつ入力してしまうと後続の type と順番が入れ替わってしまったりするので、そのリスクを最小化するため
            // にまとめて一気に単なる入力として渡してしまう。残念ながら完璧ではないが...
            const text = [...vimState.keysPressed, ...vimState.keysQueued]
                .filter((key) => {
                    // <Waltz> や <C- <A- <D- などで始まるキーは特殊キーなので、文字として入力しない。
                    return (
                        !key.startsWith('<Waltz>') &&
                        !key.startsWith('<C-') &&
                        !key.startsWith('<A-') &&
                        !key.startsWith('<D-')
                    );
                })
                .join('');
            await vscode.commands.executeCommand('type', { text });
            vimState.keysPressed = [];
            vimState.keysQueued = [];
            return;
        }

        // そうでなければ先頭から一文字取り出して処理する。
        const char = vimState.keysQueued.shift();
        if (!char) {
            // 基本的には一文字ずつ処理するので、呼び出し回数とキーの数は一致しており、何かしら処理対象のキーがある場合
            // が多い。ただ、上記のように insert モードに入ったことでまとめてキーを処理した場合は、それ以降のハンドラ呼
            // び出しではもう処理するべきキーが残っていないことがあるので、その場合は何も考えずに終了する。
            return;
        }

        // In other modes, add to pressed keys and try to execute actions
        vimState.keysPressed.push(char);

        const context: Context = {
            editor,
            document: editor.document,
            vimState,
            commentConfigProvider: globalCommentConfigProvider,
        };

        // Try to execute an action
        let executed = false;
        let needsMore = false;

        for (const action of vimState.actions) {
            const result = await action(context, vimState.keysPressed);

            if (result === 'executed') {
                executed = true;
                console.log('Action executed for keys:', vimState.keysPressed);
                break;
            } else if (result === 'needsMoreKey') {
                needsMore = true;
            }
        }

        // Debug logging
        if (!executed && !needsMore) {
            console.log('No action matched for keys:', vimState.keysPressed);
        } else if (!executed && needsMore) {
            console.log('Action needs more keys:', vimState.keysPressed);
        }

        if (executed) {
            // If an action was executed, clear the keys
            vimState.keysPressed = [];
            console.log('cleared due to execution');
        } else if (!needsMore) {
            // No action matched and no action needs more input, clear the keys
            vimState.keysPressed = [];
            console.log('cleared due to no match');
        }
    });
}
