import type { KeysParseResult, KeysParser } from './keysParserTypes';

/**
 * 完全一致のキーパーサーを作成
 *
 * @example
 * const parser = keysParserPrefix(['d', 'd']);
 * parser(['d'])       // => { result: 'needsMoreKey' }
 * parser(['d', 'd'])  // => { result: 'match', variables: {} }
 * parser(['d', 'w'])  // => { result: 'noMatch' }
 */
export function keysParserPrefix(matchKeys: string[]): KeysParser {
    return (keys: string[]): KeysParseResult => {
        // keysがmatchKeysで始まる（またはそれ以上）
        if (arrayStartsWith(keys, matchKeys)) {
            return { result: 'match', variables: {} };
        }

        // matchKeysがkeysで始まる（もっとキーが必要）
        if (arrayStartsWith(matchKeys, keys)) {
            return { result: 'needsMoreKey' };
        }

        // 不一致
        return { result: 'noMatch' };
    };
}

/**
 * 正規表現のキーパーサーを作成
 *
 * @param pattern 完全一致パターン (named groupsを使用可能)
 * @param partial 部分一致パターン
 *
 * @example
 * const parser = keysParserRegex(/^f(?<char>.)$/, /^f$/);
 * parser(['f'])           // => { result: 'needsMoreKey' }
 * parser(['f', 'a'])      // => { result: 'match', variables: { char: 'a', '1': 'a' } }
 * parser(['f', 'b'])      // => { result: 'match', variables: { char: 'b', '1': 'b' } }
 * parser(['x'])           // => { result: 'noMatch' }
 */
export function keysParserRegex(pattern: RegExp, partial: RegExp): KeysParser {
    return (keys: string[]): KeysParseResult => {
        const keysStr = keys.join('');

        // 完全一致
        const match = keysStr.match(pattern);
        if (match) {
            // named groupsと数値インデックスのgroupsを抽出
            const variables: Record<string, string> = {};

            // named groupsを追加
            if (match.groups) {
                Object.assign(variables, match.groups);
            }

            // 数値インデックスのgroupsも追加
            for (let i = 1; i < match.length; i++) {
                if (match[i] !== undefined) {
                    variables[String(i)] = match[i];
                }
            }

            return { result: 'match', variables };
        }

        // 部分一致
        if (keysStr.match(partial)) {
            return { result: 'needsMoreKey' };
        }

        // 不一致
        return { result: 'noMatch' };
    };
}

function arrayStartsWith<T>(xs: T[], prefix: T[]): boolean {
    if (prefix.length > xs.length) {
        return false;
    }
    for (let i = 0; i < prefix.length; i++) {
        if (xs[i] !== prefix[i]) {
            return false;
        }
    }
    return true;
}
