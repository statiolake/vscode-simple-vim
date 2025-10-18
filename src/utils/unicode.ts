/**
 * 文字が単語文字（英数字またはアンダースコア）かどうかを判定
 */
export function isWordCharacter(character: string): boolean {
    return /\w/.test(character);
}

/**
 * 文字が空白文字かどうかを判定
 */
export function isWhitespace(character: string): boolean {
    return /\s/.test(character);
}

/**
 * 文字がひらがなかどうかを判定
 */
export function isHiragana(character: string): boolean {
    const code = character.charCodeAt(0);
    return code >= 0x3040 && code <= 0x309f;
}

/**
 * 文字がカタカナかどうかを判定
 */
export function isKatakana(character: string): boolean {
    const code = character.charCodeAt(0);
    return code >= 0x30a0 && code <= 0x30ff;
}

/**
 * 文字が漢字かどうかを判定
 */
export function isKanji(character: string): boolean {
    const code = character.charCodeAt(0);
    // CJK統合漢字の範囲
    return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
}

/**
 * 単語の種類を判定
 * - 'whitespace': 空白文字
 * - 'word': 単語文字（英数字またはアンダースコア）
 * - 'hiragana': ひらがな
 * - 'katakana': カタカナ
 * - 'kanji': 漢字
 * - 'other': その他の文字
 */
export type CharacterType = 'whitespace' | 'word' | 'hiragana' | 'katakana' | 'kanji' | 'other';

export function getCharacterType(character: string): CharacterType {
    if (isWhitespace(character)) {
        return 'whitespace';
    }
    if (isWordCharacter(character)) {
        return 'word';
    }
    if (isHiragana(character)) {
        return 'hiragana';
    }
    if (isKatakana(character)) {
        return 'katakana';
    }
    if (isKanji(character)) {
        return 'kanji';
    }
    return 'other';
}

/**
 * 文字種が変わる境界かどうかを判定（w/e/b/ge用）
 */
export function isCharacterTypeBoundary(char1: string, char2: string): boolean {
    return getCharacterType(char1) !== getCharacterType(char2);
}

/**
 * 空白が境界かどうかを判定（W/E/B/gE用）
 */
export function isWhitespaceBoundary(char1: string, char2: string): boolean {
    return isWhitespace(char1) !== isWhitespace(char2);
}
