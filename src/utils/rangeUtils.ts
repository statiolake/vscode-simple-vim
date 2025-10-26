import { Range, type TextDocument } from 'vscode';

/**
 * 範囲のテキストを正規表現で分割する
 *
 * 空の範囲の場合でも元の範囲を保持する（カーソル位置を失わないため）
 * マッチが見つからない場合も元の範囲をそのまま返す
 *
 * @param document テキストドキュメント
 * @param range 対象範囲
 * @param pattern 分割に使用する正規表現パターン
 * @returns 分割後の各部分の範囲の配列（最低1つは返る）
 *
 * @example
 * // "hello, world" を ", " で分割
 * splitRangeByPattern(document, range, /, /)
 * // => [Range(hello), Range(world)]
 */
export function splitRangeByPattern(document: TextDocument, range: Range, pattern: RegExp): Range[] {
    const text = document.getText(range);
    const baseOffset = document.offsetAt(range.start);

    // グローバルフラグを確実に設定
    const globalPattern = pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);

    const ranges: Range[] = [];
    let start = range.start;
    let match: RegExpExecArray | null = null;

    let lastRange: Range | undefined;
    // biome-ignore lint/suspicious/noAssignInExpressions: standard pattern for regex matching
    while ((match = globalPattern.exec(text)) !== null) {
        const midEnd = document.positionAt(baseOffset + match.index);
        const midStart = document.positionAt(baseOffset + match.index + match[0].length);

        if (lastRange?.start.isEqual(lastRange.end) && lastRange.end.isEqual(start)) {
            // 前回の空マッチと今回のマッチが連続する場合、前回の空マッチを削除して今回のマッチのみを追加する
            ranges.pop();
        }
        lastRange = new Range(start, midEnd);
        ranges.push(lastRange);

        start = midStart;
        if (match[0].length === 0) {
            // 無限ループを防ぐ（空文字列マッチの場合は1文字進める）
            globalPattern.lastIndex++;
        }
    }

    // 最後の部分を追加
    if (lastRange?.start.isEqual(lastRange.end) && lastRange.end.isEqual(start)) {
        // 前回の空マッチと最後の部分が連続する場合、前回の空マッチを削除して最後の部分のみを追加する
        ranges.pop();
    }
    ranges.push(new Range(start, range.end));

    return ranges;
}

/**
 * 範囲のテキストから正規表現にマッチする部分のみを抽出する
 *
 * 空のパターン（例: /(?:)/）は全ての位置にマッチするため、空の範囲も返す
 *
 * @param document テキストドキュメント
 * @param range 対象範囲
 * @param pattern マッチに使用する正規表現パターン
 * @returns マッチした各部分の範囲の配列（マッチがない場合は空配列）
 *
 * @example
 * // "hello, world" から単語のみを抽出
 * filterRangeByPattern(document, range, /\w+/)
 * // => [Range(hello), Range(world)]
 */
export function filterRangeByPattern(document: TextDocument, range: Range, pattern: RegExp): Range[] {
    const text = document.getText(range);
    const baseOffset = document.offsetAt(range.start);

    // グローバルフラグを確実に設定
    const globalPattern = pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);

    const ranges: Range[] = [];
    let match: RegExpExecArray | null = null;

    // biome-ignore lint/suspicious/noAssignInExpressions: standard pattern for regex matching
    while ((match = globalPattern.exec(text)) !== null) {
        const start = document.positionAt(baseOffset + match.index);
        const end = document.positionAt(baseOffset + match.index + match[0].length);

        // マッチした部分を追加（空の範囲も含む - 空のパターンは全位置にマッチするため）
        ranges.push(new Range(start, end));

        // 無限ループを防ぐ（空文字列マッチの場合は1文字進める）
        if (match[0].length === 0) {
            globalPattern.lastIndex = match.index + 1;
        }
    }

    return ranges;
}
