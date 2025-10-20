import * as vscode from 'vscode';
import type { RegisterContent, VimState } from './vimState';

/**
 * レジスタから内容を取得する
 * クリップボードの変更を検出し、変更があれば外部コピーを優先する
 *
 * @param vimState - Vim状態
 * @returns レジスタの内容（クリップボード変更検出時は外部コピー）
 */
export async function getRegisterContents(vimState: VimState): Promise<RegisterContent[]> {
    let currentClipboard: string;
    try {
        currentClipboard = await vscode.env.clipboard.readText();
    } catch (error) {
        console.error('Failed to read from clipboard:', error);
        // クリップボード読み取りエラーの場合はレジスタを使用
        return vimState.register.contents;
    }

    if (currentClipboard === vimState.register.lastClipboardText) {
        // クリップボード変更なし → レジスタの内容を返す（メタデータ保持）
        return vimState.register.contents;
    }

    // クリップボードが変更されているということは外部のアプリでコピーされた可能性が高いので、クリップボード側の
    // 内容を優先して返す。
    return [
        {
            text: currentClipboard,
            isLinewise: false,
        },
    ];
}

/**
 * レジスタに内容を保存し、クリップボードにも同期する
 *
 * @param vimState - Vim状態
 * @param contents - 保存する内容
 */
export async function setRegisterContents(vimState: VimState, contents: RegisterContent[]): Promise<void> {
    // レジスタに保存
    vimState.register.contents = contents;

    // クリップボードにも同期（改行区切り）
    const clipboardText = contents.map((c) => c.text).join('\n');
    try {
        await vscode.env.clipboard.writeText(clipboardText);
        vimState.register.lastClipboardText = clipboardText;
    } catch (error) {
        // クリップボード書き込みエラーの場合は無視（レジスタは保存されている）
        console.error('Failed to write to clipboard:', error);
    }
}
