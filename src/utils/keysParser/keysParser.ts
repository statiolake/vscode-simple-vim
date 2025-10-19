import type { KeysParseResult, KeysParser } from './keysParserTypes';

/**
 * 完全一致のキーパーサーを作成
 *
 * @example
 * const parser = keysParserPrefix(['d', 'd']);
 * parser(['d'])       // => { result: 'needsMoreKey' }
 * parser(['d', 'd'])  // => { result: 'match', variables: {}, remainingKeys: [] }
 * parser(['d', 'w'])  // => { result: 'noMatch' }
 */
export function keysParserPrefix(matchKeys: string[]): KeysParser {
    return (keys: string[]): KeysParseResult => {
        // keysがmatchKeysで始まる（またはそれ以上）
        if (arrayStartsWith(keys, matchKeys)) {
            const remainingKeys = keys.slice(matchKeys.length);
            return { result: 'match', variables: {}, remainingKeys };
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
 * parser(['f', 'a'])      // => { result: 'match', variables: { char: 'a', '1': 'a' }, remainingKeys: [] }
 * parser(['f', 'b'])      // => { result: 'match', variables: { char: 'b', '1': 'b' }, remainingKeys: [] }
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

            // マッチした文字列の長さを計算して、remainingKeys を取得
            const matchedLength = match[0].length;
            let consumedKeys = 0;
            let lengthSoFar = 0;
            for (let i = 0; i < keys.length; i++) {
                lengthSoFar += keys[i].length;
                consumedKeys = i + 1;
                if (lengthSoFar >= matchedLength) {
                    break;
                }
            }
            const remainingKeys = keys.slice(consumedKeys);

            return { result: 'match', variables, remainingKeys };
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
