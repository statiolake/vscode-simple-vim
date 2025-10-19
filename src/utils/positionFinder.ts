import { Position, Range, type TextDocument } from 'vscode';
import { isWhitespace } from './unicode';

/**
 * オフセット範囲のテキストを取得
 */
function getTextOfOffsetRange(document: TextDocument, startOffset: number, endOffset: number): string {
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
    const text = document.getText();
    const offset = document.offsetAt(position);

    // タグの正規表現パターン
    const tagPattern = /<([a-zA-Z][a-zA-Z0-9-]*)([\s/>]|>)/g;
    const closeTagPattern = /<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/g;

    // position の左側から最も近い開始タグを探す
    let openingTagName = '';
    let openingTagStart = 0;
    let openingTagEnd = 0;

    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(text)) !== null) {
        if (match.index >= offset) break;

        const tagStart = match.index;
        const tagEnd = tagPattern.lastIndex;
        const fullTag = text.substring(tagStart, tagEnd);

        // 自己閉じタグはスキップ
        if (fullTag.includes('/>')) continue;

        openingTagName = match[1];
        openingTagStart = tagStart;
        openingTagEnd = tagEnd;
    }

    if (openingTagName === '') return undefined;

    // 対応する閉じタグを探す（ネストを考慮）
    let tagDepth = 1;
    let searchOffset = openingTagEnd;

    while (tagDepth > 0) {
        // 次の開始タグと閉じタグを探す
        const nextOpenMatch = /(<([a-zA-Z][a-zA-Z0-9-]*)([\s/>]|>))/g;
        nextOpenMatch.lastIndex = searchOffset;

        const nextOpen = nextOpenMatch.exec(text);
        const nextOpenOffset = nextOpen ? nextOpen.index : Infinity;

        closeTagPattern.lastIndex = searchOffset;
        const nextClose = closeTagPattern.exec(text);
        const nextCloseOffset = nextClose ? nextClose.index : Infinity;
        const nextCloseEnd = closeTagPattern.lastIndex;

        if (nextCloseOffset === Infinity) return undefined;

        if (nextOpenOffset < nextCloseOffset) {
            // 次の開始タグが先
            const openTag = text.substring(nextOpenOffset, nextOpenMatch.lastIndex);
            if (!openTag.includes('/>') && nextOpen && nextOpen[1] === openingTagName) {
                tagDepth++;
            }
            searchOffset = nextOpenMatch.lastIndex;
        } else {
            // 次の閉じタグが先
            if (nextClose && nextClose[1] === openingTagName) {
                tagDepth--;
            }
            if (tagDepth === 0) {
                const innerStart = openingTagEnd;
                const innerEnd = nextCloseOffset;
                const outerStart = openingTagStart;
                const outerEnd = nextCloseEnd;

                return {
                    innerRange: new Range(document.positionAt(innerStart), document.positionAt(innerEnd)),
                    outerRange: new Range(document.positionAt(outerStart), document.positionAt(outerEnd)),
                };
            }
            searchOffset = nextCloseEnd;
        }
    }

    return undefined;
}
