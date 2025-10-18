import * as vscode from 'vscode';

type SelectionChange = {
    oldSelection: vscode.Selection;
    newSelection: vscode.Selection;
    lineDelta: number;
    characterDelta: number;
    anchorChanged: boolean;
    isEmptyBefore: boolean;
    isEmptyAfter: boolean;
};

/**
 * エディタの選択を更新する。可能な限り cursorMove コマンドを使用して、
 * カーソルundoの履歴ポイントが作成されるのを回避する。
 *
 * 複雑な移動パターンの場合は直接代入にフォールバックする。
 */
export async function updateSelections(editor: vscode.TextEditor, newSelections: vscode.Selection[]): Promise<void> {
    const oldSelections = editor.selections;

    // 選択の個数が変わった場合は cursorMove が使えないため、直接代入
    if (oldSelections.length !== newSelections.length) {
        editor.selections = newSelections;
        return;
    }

    // 各選択の変化を分析
    const changes: SelectionChange[] = oldSelections.map((oldSel, i) => {
        const newSel = newSelections[i];
        const lineDelta = newSel.active.line - oldSel.active.line;
        const characterDelta = lineDelta === 0 ? newSel.active.character - oldSel.active.character : 0;

        return {
            oldSelection: oldSel,
            newSelection: newSel,
            lineDelta,
            characterDelta,
            anchorChanged: !newSel.anchor.isEqual(oldSel.anchor),
            isEmptyBefore: oldSel.isEmpty,
            isEmptyAfter: newSel.isEmpty,
        };
    });

    // すべてのカーソルが同じパターンで移動している場合は cursorMove を使用
    if (await tryUseCursorMove(editor, changes)) {
        return;
    }

    // フォールバック: 直接代入
    console.log('fallback to direct selection update');
    editor.selections = newSelections;
}

/**
 * cursorMove で選択の変化を適用できるか試みる。
 * 成功した場合は true を返す。
 */
async function tryUseCursorMove(editor: vscode.TextEditor, changes: SelectionChange[]): Promise<boolean> {
    // すべてのカーソルの行移動が同じかチェック
    const lineDelta = changes[0].lineDelta;
    const allSameLineDelta = changes.every((c) => c.lineDelta === lineDelta);

    if (allSameLineDelta) {
        // 純粋な行移動（同じ行内での文字変化なし）かチェック
        const allCharacterDeltaZero = changes.every((c) => c.characterDelta === 0);
        if (allCharacterDeltaZero && lineDelta !== 0) {
            return await tryLineMovement(editor, changes, lineDelta);
        }
    }

    // すべてのカーソルが同じ文字数移動しているかチェック（同じ行内）
    const characterDelta = changes[0].characterDelta;
    const allSameCharacterDelta = changes.every((c) => c.lineDelta === 0 && c.characterDelta === characterDelta);

    if (allSameCharacterDelta && characterDelta !== 0) {
        return await tryCharacterMovement(editor, changes, characterDelta);
    }

    // すべてのカーソルが行頭に移動したかチェック
    if (changes.every((c) => isMovingToLineStart(editor, c))) {
        return await tryLineStartMovement(editor, changes);
    }

    // すべてのカーソルが行末に移動したかチェック
    if (changes.every((c) => isMovingToLineEnd(editor, c))) {
        return await tryLineEndMovement(editor, changes);
    }

    return false;
}

/**
 * cursorMove で行移動を適用する。
 */
async function tryLineMovement(
    editor: vscode.TextEditor,
    changes: SelectionChange[],
    lineDelta: number,
): Promise<boolean> {
    // 選択状態が統一されているかチェック
    const shouldSelect = !changes[0].isEmptyAfter || !changes[0].isEmptyBefore;

    // すべての変化が矛盾しない選択セマンティクスを持つかチェック
    for (const change of changes) {
        // 許可: empty -> empty, empty -> 選択, 選択 -> 選択（anchor 固定）
        const isConsistent =
            (change.isEmptyBefore && change.isEmptyAfter) ||
            (change.isEmptyBefore && !change.isEmptyAfter) ||
            (!change.isEmptyBefore && !change.isEmptyAfter && !change.anchorChanged);

        if (!isConsistent) {
            return false;
        }
    }

    try {
        await vscode.commands.executeCommand('cursorMove', {
            to: lineDelta > 0 ? 'down' : 'up',
            by: 'line',
            value: Math.abs(lineDelta),
            select: shouldSelect,
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * cursorMove で文字移動を適用する。
 */
async function tryCharacterMovement(
    editor: vscode.TextEditor,
    changes: SelectionChange[],
    characterDelta: number,
): Promise<boolean> {
    // 選択状態が統一されているかチェック
    const shouldSelect = !changes[0].isEmptyAfter || !changes[0].isEmptyBefore;

    // すべての変化が矛盾しない選択セマンティクスを持つかチェック
    for (const change of changes) {
        const isConsistent =
            (change.isEmptyBefore && change.isEmptyAfter) ||
            (change.isEmptyBefore && !change.isEmptyAfter) ||
            (!change.isEmptyBefore && !change.isEmptyAfter && !change.anchorChanged);

        if (!isConsistent) {
            return false;
        }
    }

    try {
        await vscode.commands.executeCommand('cursorMove', {
            to: characterDelta > 0 ? 'right' : 'left',
            by: 'character',
            value: Math.abs(characterDelta),
            select: shouldSelect,
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * cursorMove で行頭への移動を適用する。
 */
async function tryLineStartMovement(_editor: vscode.TextEditor, changes: SelectionChange[]): Promise<boolean> {
    // 選択状態が統一されているかチェック
    const shouldSelect = !changes[0].isEmptyAfter;

    try {
        await vscode.commands.executeCommand('cursorMove', {
            to: 'wrappedLineStart',
            select: shouldSelect,
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * cursorMove で行末への移動を適用する。
 */
async function tryLineEndMovement(_editor: vscode.TextEditor, changes: SelectionChange[]): Promise<boolean> {
    // 選択状態が統一されているかチェック
    const shouldSelect = !changes[0].isEmptyAfter;

    try {
        await vscode.commands.executeCommand('cursorMove', {
            to: 'wrappedLineEnd',
            select: shouldSelect,
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * 選択の変化が行頭への移動かチェック。
 */
function isMovingToLineStart(editor: vscode.TextEditor, change: SelectionChange): boolean {
    const { newSelection } = change;
    const newLine = editor.document.lineAt(newSelection.active.line);

    // 行頭（文字位置0）への移動
    const newCharIsZero = newSelection.active.character === 0;

    // または最初の非空白文字への移動
    const firstNonWhitespace = newLine.text.search(/\S/);
    const newCharIsFirstNonWhitespace = firstNonWhitespace >= 0 && newSelection.active.character === firstNonWhitespace;

    return newCharIsZero || newCharIsFirstNonWhitespace;
}

/**
 * 選択の変化が行末への移動かチェック。
 */
function isMovingToLineEnd(editor: vscode.TextEditor, change: SelectionChange): boolean {
    const { newSelection } = change;
    const newLine = editor.document.lineAt(newSelection.active.line);

    // 行末（最後の文字の後）への移動
    return newSelection.active.character === newLine.text.length;
}
