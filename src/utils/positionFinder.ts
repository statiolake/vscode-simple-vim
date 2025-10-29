import { Position, Range, type TextDocument } from 'vscode';
import { isWhitespace } from './unicode';

/**
 * オフセット範囲のテキストを取得
 */
function getTextOfOffsetRange(document: TextDocument, startOffset: number, endOffset: number): string {
    startOffset = Math.max(0, startOffset);
    endOffset = Math.max(0, endOffset);
    return document.getText(
        document.validateRange(new Range(document.positionAt(startOffset), document.positionAt(endOffset))),
    );
}

/**
 * 次の文字の位置を探す
 */
export function findAdjacentPosition(
    document: TextDocument,
    direction: 'before' | 'after',
    position: Position,
): Position {
    let offset = document.offsetAt(position);
    offset += direction === 'before' ? -1 : 1;
    return document.validatePosition(document.positionAt(offset));
}

export function findNearerPosition(
    document: TextDocument,
    predicate: (character: string) => boolean,
    direction: 'before' | 'after',
    position: Position,
    opts: {
        withinLine: boolean;
        maxOffsetWidth?: number;
    },
): Position | undefined {
    // 指定なければ無制限で探索する
    const maxOffsetWidth = opts.maxOffsetWidth ?? Infinity;

    let offset = document.offsetAt(position);
    const line = document.lineAt(position.line);
    const minOffset = opts.withinLine ? document.offsetAt(line.range.start) : Math.max(0, offset - maxOffsetWidth);
    const maxOffset = opts.withinLine
        ? document.offsetAt(line.range.end)
        : Math.min(document.offsetAt(document.lineAt(document.lineCount - 1).range.end), offset + maxOffsetWidth);
    const delta = direction === 'before' ? -1 : 1;

    while (minOffset <= offset && offset < maxOffset) {
        const char = getTextOfOffsetRange(document, offset, offset + delta);
        if (predicate(char)) return document.positionAt(offset);
        offset += delta;
    }

    return undefined;
}

/**
 * 次の行の先頭を探す
 */
export function findNextLineStart(document: TextDocument, position: Position): Position {
    const nextLine = document.lineAt(position.line + 1);
    return nextLine.range.start;
}

export function findLineStart(_document: TextDocument, position: Position): Position {
    return new Position(position.line, 0);
}

/**
 * 行のインデント後の開始位置を探す
 */
export function findLineStartAfterIndent(document: TextDocument, position: Position): Position {
    const line = document.lineAt(position.line);
    const firstNonWhitespaceCharacterIndex = line.firstNonWhitespaceCharacterIndex;
    return new Position(position.line, firstNonWhitespaceCharacterIndex);
}

/**
 * 行末の位置を探す
 */
export function findLineEnd(document: TextDocument, position: Position): Position {
    const line = document.lineAt(position.line);
    return line.range.end;
}

export function findDocumentStart(_document: TextDocument): Position {
    return new Position(0, 0);
}

export function findDocumentEnd(document: TextDocument): Position {
    const lastLineIndex = document.lineCount - 1;
    const lastLine = document.lineAt(lastLineIndex);
    return lastLine.range.end;
}

/**
 * 単語境界を探す
 * @param document ドキュメント
 * @param direction 探索方向（'before' は現在位置より前、'after' は現在位置より後）
 * @param distance 境界の種類（'nearer' は現在位置に近い境界、'further' は現在位置から遠い境界）
 * @param position 開始位置
 * @param isBoundary 2つの文字が境界かどうかを判定する関数
 * @returns 見つかった位置、見つからない場合は undefined
 */
export function findWordBoundary(
    document: TextDocument,
    distance: 'nearer' | 'further',
    direction: 'before' | 'after',
    position: Position,
    isBoundary: (char1: string, char2: string) => boolean,
): Position | undefined {
    let offset = document.offsetAt(position);
    const delta = direction === 'before' ? -1 : 1;

    const skipWhile = (cond: (char: string) => boolean) => {
        while (true) {
            const char = getTextOfOffsetRange(document, offset, offset + delta);
            if (!char || !cond(char)) break;
            offset += delta;
        }
    };

    if (distance === 'nearer') {
        // すでに始まっている単語の末尾までスキップする
        const previousChar = getTextOfOffsetRange(document, offset - delta, offset);
        skipWhile((char) => !isBoundary(previousChar, char));
        // その後、空白を無視すると次の単語の先頭にいる
        skipWhile(isWhitespace);
    } else {
        const previousChar = getTextOfOffsetRange(document, offset - delta, offset);
        if (isWhitespace(previousChar)) {
            // 空白のど真ん中にいるときはまず空白をスキップする
            skipWhile(isWhitespace);
            // その後、これから始まる単語の末尾までスキップする
            const currentChar = getTextOfOffsetRange(document, offset, offset + delta);
            skipWhile((char) => !isBoundary(currentChar, char));
        } else {
            // すでに単語が始まっている場合は、その単語の末尾までスキップする
            const previousChar = getTextOfOffsetRange(document, offset - delta, offset);
            skipWhile((char) => !isBoundary(previousChar, char));
        }
    }

    return document.positionAt(offset);
}

/**
 * 段落境界を探す
 *
 * @param document ドキュメント
 * @param direction 探索方向（'before' は現在位置より前、'after' は現在位置より後）
 * @param position 開始位置
 * @returns 見つかった位置
 */
export function findParagraphBoundary(
    document: TextDocument,
    direction: 'before' | 'after',
    position: Position,
): Position {
    let line = position.line;
    const delta = direction === 'before' ? -1 : 1;
    while (0 <= line + delta && line + delta < document.lineCount) {
        line += delta;
        const lineText = document.lineAt(line).text;
        if (lineText.trim() === '') break;
    }

    return new Position(line, 0);
}

export function findInsideBalancedPairs(
    document: TextDocument,
    position: Position,
    open: string,
    close: string,
): Range | undefined {
    // まず、左右に開き括弧と閉じ括弧を探す。ただし、position から左、position から右のそれぞれの範囲で、きちんと括弧の
    // バランスがとれていることが必要。
    const computeDegree = (text: string): number => {
        let degree = 0;
        for (const char of text) {
            if (char === open) degree++;
            if (char === close) degree--;
        }
        return degree;
    };

    const findBalancedNearerPosition = (direction: 'before' | 'after') => {
        const findTarget = direction === 'before' ? open : close;
        let nextPosition = position;
        let foundAt: Position | undefined;
        while (true) {
            foundAt = findNearerPosition(document, (char) => char === findTarget, direction, nextPosition, {
                withinLine: false,
                maxOffsetWidth: 10000,
            });
            if (!foundAt) return undefined;

            if (computeDegree(document.getText(new Range(position, foundAt))) === 0) {
                return foundAt;
            }

            // 同じ場所をヒットさせないように一歩進む
            nextPosition = findAdjacentPosition(document, direction, foundAt);
        }
    };

    const foundAtBefore = findBalancedNearerPosition('before');
    const foundAtAfter = findBalancedNearerPosition('after');
    if (!foundAtBefore || !foundAtAfter) return undefined;

    return new Range(foundAtBefore, foundAtAfter);
}

/**
 * タグペア情報を返す型
 */
export type TagPairInfo = {
    innerRange: Range; // タグ内部の範囲（タグ自体は含まない）
    outerRange: Range; // タグ全体の範囲（タグを含む）
};

/**
 * タグペアを検索し、内部と外部の範囲を返す
 * @param document ドキュメント
 * @param position 開始位置
 * @returns タグペア情報 (innerRange: 内部, outerRange: 外部)、見つからない場合は undefined
 */
export function findMatchingTag(document: TextDocument, position: Position): TagPairInfo | undefined {
    // ===== ステップ1: 左側の開始タグを探す =====
    const openingTag = scanForTag(document, position, 'before');
    if (!openingTag) return undefined;

    // ===== ステップ2: 右側の閉じタグを探す =====
    const closingTag = scanForTag(document, document.positionAt(openingTag.tagEnd), 'after', openingTag.tagName);
    if (!closingTag) return undefined;

    return {
        innerRange: new Range(document.positionAt(openingTag.tagEnd), document.positionAt(closingTag.tagStart)),
        outerRange: new Range(document.positionAt(openingTag.tagStart), document.positionAt(closingTag.tagEnd)),
    };
}

/**
 * タグをスキャンして探す（左方向 or 右方向）
 * 左方向: カーソル位置の左で最も近い開始タグを探す（ネストを考慮）
 * 右方向: 指定されたタグ名の閉じタグを探す（ネストを考慮）
 */
function scanForTag(
    document: TextDocument,
    position: Position,
    direction: 'before' | 'after',
    targetTagName?: string,
): { tagName: string; tagStart: number; tagEnd: number } | undefined {
    const tagStack: string[] = [];
    let currentPos = position;

    while (true) {
        // 次のタグ括弧を探す
        const nextBracket =
            direction === 'before'
                ? findNearerPosition(document, (ch) => ch === '>', direction, currentPos, { withinLine: false })
                : findNearerPosition(document, (ch) => ch === '<', direction, currentPos, { withinLine: false });

        if (!nextBracket) return undefined;

        // タグ範囲を取得（<...> のペア）
        const tagRange = findTagRangeAt(document, nextBracket, direction);
        if (!tagRange) {
            currentPos = findAdjacentPosition(document, direction, nextBracket);
            continue;
        }

        // tagRange は findInsideBalancedPairs が返すもので、< と > の間（括弧自体は含まない）
        const tagStart = document.offsetAt(tagRange.start);
        const tagEnd = document.offsetAt(tagRange.end);
        // tagRange.start から tagRange.end までのテキストを取得
        const tagContent = getTextOfOffsetRange(document, tagStart, tagEnd).trim();
        const tagInfo = parseTagContent(tagContent);

        if (!tagInfo || tagInfo.isSelfClosing) {
            currentPos = findAdjacentPosition(document, direction, nextBracket);
            continue;
        }

        const { tagName, isOpeningTag } = tagInfo;

        if (direction === 'before') {
            // 左方向: 開始タグを探す
            if (isOpeningTag) {
                if (tagStack.length === 0) {
                    // tagStart は < の次、tagEnd は > の位置
                    // 返すべきは: tagStart = < の位置、tagEnd = > の次の位置
                    return { tagName, tagStart: tagStart - 1, tagEnd: tagEnd + 1 };
                }
                if (tagStack[tagStack.length - 1] === tagName) {
                    tagStack.pop();
                }
            } else {
                tagStack.push(tagName);
            }
        } else {
            // 右方向: targetTagName の閉じタグを探す
            if (isOpeningTag) {
                if (tagName === targetTagName) {
                    tagStack.push(tagName);
                }
            } else {
                if (tagName === targetTagName) {
                    if (tagStack.length === 0) {
                        // tagStart は < の次、tagEnd は > の位置
                        // 返すべきは: tagStart = < の位置、tagEnd = > の次の位置
                        return { tagName, tagStart: tagStart - 1, tagEnd: tagEnd + 1 };
                    }
                    tagStack.pop();
                }
            }
        }

        currentPos = findAdjacentPosition(document, direction, nextBracket);
    }
}

/**
 * 指定された括弧位置からタグ範囲（<...>）を取得
 * direction='before': > の位置から、対応する < を探して Range を返す
 * direction='after': < の位置から、対応する > を探して Range を返す
 */
function findTagRangeAt(
    document: TextDocument,
    bracketPos: Position,
    direction: 'before' | 'after',
): Range | undefined {
    // 括弧の内側の位置を取得
    const insidePos = findAdjacentPosition(document, direction === 'before' ? 'before' : 'after', bracketPos);
    // findInsideBalancedPairs で <...> のペアを探す
    return findInsideBalancedPairs(document, insidePos, '<', '>');
}

/**
 * タグのコンテンツ（< > の内側）をパースして、タグ情報を抽出
 * @returns tagName, isOpeningTag, isSelfClosing
 */
function parseTagContent(
    content: string,
): { tagName: string; isOpeningTag: boolean; isSelfClosing: boolean } | undefined {
    if (!content) return undefined;

    // 閉じタグ判定 </tagname>
    if (content.startsWith('/')) {
        const tagName = extractTagName(content.substring(1));
        if (!tagName) return undefined;
        return { tagName, isOpeningTag: false, isSelfClosing: false };
    }

    // 開始タグ / 自己閉じタグ
    const isSelfClosing = content.endsWith('/');
    const contentToCheck = isSelfClosing ? content.substring(0, content.length - 1) : content;

    const tagName = extractTagName(contentToCheck);
    if (!tagName) return undefined;

    return { tagName, isOpeningTag: true, isSelfClosing };
}

/**
 * コンテンツからタグ名を抽出
 * <tagname attr="value"> → "tagname"
 * </tagname> → "tagname"
 */
function extractTagName(content: string): string {
    const match = content.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
    return match ? match[1] : '';
}

/**
 * 現在位置の引数の範囲を探す
 * C言語系の関数呼び出し内での引数を想定
 * 例: func(a, b, c) の中で b にカーソルがあれば、b の範囲を返す
 *
 * @param document ドキュメント
 * @param position カーソル位置
 * @param opts オプション
 * @param opts.includeComma コンマを含めるかどうか（デフォルト: false）
 *   false: 引数のみを選択
 *   true: 第一引数なら後ろのコンマを、それ以外なら前のコンマを含める
 * @returns 引数の範囲、見つからない場合は undefined
 */
export function findCurrentArgument(
    document: TextDocument,
    position: Position,
    opts?: { includeComma?: boolean },
): Range | undefined {
    // まず、現在位置を囲む括弧内の範囲を取得
    const parenRange = findInsideBalancedPairs(document, position, '(', ')');
    if (!parenRange) return undefined;

    // 括弧内のテキストを取得
    const insideText = document.getText(parenRange);
    const startOffset = document.offsetAt(parenRange.start);
    const currentOffset = document.offsetAt(position);

    // 現在位置の相対位置を計算
    const currentRelativeOffset = currentOffset - startOffset;

    // 括弧内でカンマを探す（文字列とキャラクターリテラルを考慮）
    const commaPositions: number[] = [];
    let i = 0;
    while (i < insideText.length) {
        const char = insideText[i];

        // ダブルクォートの文字列をスキップ
        if (char === '"') {
            i++;
            while (i < insideText.length && insideText[i] !== '"') {
                if (insideText[i] === '\\') i++; // エスケープ文字をスキップ
                i++;
            }
            i++;
            continue;
        }

        // シングルクォートの文字列またはキャラクターリテラルをスキップ
        if (char === "'") {
            i++;
            while (i < insideText.length && insideText[i] !== "'") {
                if (insideText[i] === '\\') i++; // エスケープ文字をスキップ
                i++;
            }
            i++;
            continue;
        }

        // 開き括弧/角括弧/中括弧があればその中身もスキップ
        if (char === '(' || char === '[' || char === '{') {
            const closeChar = char === '(' ? ')' : char === '[' ? ']' : '}';
            const innerRange = findInsideBalancedPairs(document, document.positionAt(startOffset + i), char, closeChar);
            if (innerRange) {
                i = document.offsetAt(innerRange.end) - startOffset;
            } else {
                i++;
            }
            continue;
        }

        // カンマを記録
        if (char === ',') {
            commaPositions.push(i);
        }

        i++;
    }

    // 現在位置から見て、前後のカンマを探す
    let leftCommaPos = -1;
    let rightCommaPos = insideText.length;

    for (const pos of commaPositions) {
        if (pos < currentRelativeOffset) {
            leftCommaPos = pos;
        }
        if (pos >= currentRelativeOffset && rightCommaPos === insideText.length) {
            rightCommaPos = pos;
        }
    }

    // 引数の開始と終了位置を確定（括弧内のテキスト内でのインデックス）
    let argStartInside = leftCommaPos + 1;
    let argEndInside = rightCommaPos;

    // 前後の空白をトリム
    while (argStartInside < argEndInside && isWhitespace(insideText[argStartInside])) {
        argStartInside++;
    }
    while (argEndInside > argStartInside && isWhitespace(insideText[argEndInside - 1])) {
        argEndInside--;
    }

    // includeComma オプションが true の場合、コンマを含める
    let finalStart = argStartInside;
    let finalEnd = argEndInside;

    if (opts?.includeComma) {
        const documentText = document.getText();
        const startOffsetInDoc = startOffset + argStartInside;
        const endOffsetInDoc = startOffset + argEndInside;

        // 前にコンマがあるかチェック
        let hasCommaBefore = false;
        for (let i = startOffsetInDoc - 1; i >= 0; i--) {
            const char = documentText[i];
            if (char === ',') {
                hasCommaBefore = true;
                finalStart = i - startOffset;
                break;
            }
            if (char === '(' || char === '[' || char === '{') {
                // 開き括弧に到達した、つまり第一引数
                break;
            }
        }

        // 前にコンマがなければ（第一引数）、後ろのコンマを含める
        if (!hasCommaBefore) {
            for (let i = endOffsetInDoc; i < documentText.length; i++) {
                const char = documentText[i];
                if (char === ',') {
                    finalEnd = i + 1 - startOffset;
                    break;
                }
                if (char === ')' || char === ']' || char === '}') {
                    // 閉じ括弧に到達した
                    break;
                }
            }
        }
    }

    // 結果を Range に変換
    const resultStart = document.positionAt(startOffset + finalStart);
    const resultEnd = document.positionAt(startOffset + finalEnd);

    return new Range(resultStart, resultEnd);
}

export class OffsetRange {
    startOffset: number;
    endOffset: number;

    constructor(startOffset: number, endOffset: number) {
        this.startOffset = startOffset;
        this.endOffset = endOffset;
    }

    with(updates: { startOffset?: number; endOffset?: number }): OffsetRange {
        return new OffsetRange(updates.startOffset ?? this.startOffset, updates.endOffset ?? this.endOffset);
    }

    static fromRange(document: TextDocument, range: Range): OffsetRange {
        return new OffsetRange(document.offsetAt(range.start), document.offsetAt(range.end));
    }

    toRange(document: TextDocument): Range {
        return new Range(document.positionAt(this.startOffset), document.positionAt(this.endOffset));
    }
}

export type OffsetReplaceData = {
    range: OffsetRange;
    newText: string;
};

/**
 * 置換後の範囲を探す
 */
export async function findReplacedOffsetRanges(replaces: Array<OffsetReplaceData>): Promise<OffsetRange[]> {
    // まずレンジを先頭から並べ替える
    const reordered = Array(replaces.length)
        .fill(0)
        .map((_, i) => i);
    reordered.sort((a, b) => {
        const rangeA = replaces[a].range;
        const rangeB = replaces[b].range;
        if (rangeA.startOffset < rangeB.startOffset) return -1;
        if (rangeA.startOffset > rangeB.startOffset) return 1;
        return 0;
    });
    replaces = reordered.map((i) => replaces[i]);
    const afterOffsetDeltaRanges: Array<{ delta: number; length: number }> = [];

    for (let i = 0; i < replaces.length; i++) {
        const range = replaces[i].range;
        const text = replaces[i].newText;
        afterOffsetDeltaRanges.push({
            delta: text.length - (range.endOffset - range.startOffset),
            length: text.length,
        });
    }

    // 元のカーソル位置に、挿入による影響を加味して戻す
    let totalDelta = 0;
    const newRanges = replaces.map((replace, i) => {
        const offsetDeltaRange = afterOffsetDeltaRanges[i];
        const newStart = replace.range.startOffset + totalDelta;
        const newEnd = newStart + offsetDeltaRange.length;
        const newRange = new OffsetRange(newStart, newEnd);
        totalDelta += offsetDeltaRange.delta;
        return newRange;
    });

    const restoredRanges = Array(replaces.length);
    for (let i = 0; i < reordered.length; i++) {
        restoredRanges[reordered[i]] = newRanges[i];
    }

    return restoredRanges;
}
