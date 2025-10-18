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
