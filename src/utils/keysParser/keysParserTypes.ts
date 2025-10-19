/**
 * キーパーサーの結果
 */
export type KeysParseResult =
    | { result: 'match'; variables: Record<string, string>; remainingKeys: string[] }
    | { result: 'needsMoreKey' }
    | { result: 'noMatch' };

/**
 * キーパーサー関数
 */
export type KeysParser = (keys: string[]) => KeysParseResult;
