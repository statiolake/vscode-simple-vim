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

    // 最初の空白は読み飛ばす
    skipWhile(isWhitespace);

    if (distance === 'nearer') {
        // (前から続いている) 今の単語に属している部分はスキップし、現在の単語の末尾まで移動したら、空白を無視すればそこが nearer boundary
        const previousChar = getTextOfOffsetRange(document, offset - delta, offset);
        skipWhile((char) => !isBoundary(previousChar, char));
        skipWhile(isWhitespace);
    } else {
        // (ここから始まる) 今の単語の末尾まで移動したら、そこが further boundary
        const nextChar = getTextOfOffsetRange(document, offset, offset + delta);
        skipWhile((char) => !isBoundary(nextChar, char));
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
