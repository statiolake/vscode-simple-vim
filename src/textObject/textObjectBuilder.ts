import type { Position, Range } from 'vscode';
import type { Context } from '../context';
import { keysParserPrefix, keysParserRegex } from '../utils/keysParser/keysParser';
import type { TextObject, TextObjectResult } from './textObjectTypes';

/**
 * 固定キーシーケンスでTextObjectを作成
 */
export function newTextObject(config: {
    keys: string[];
    compute: (context: Context, position: Position) => Range;
}): TextObject {
    const keysParser = keysParserPrefix(config.keys);

    return (context: Context, keys: string[], position: Position): TextObjectResult => {
        const parseResult = keysParser(keys);

        if (parseResult.result === 'noMatch') {
            return { result: 'noMatch' };
        }

        if (parseResult.result === 'needsMoreKey') {
            return { result: 'needsMoreKey' };
        }

        const range = config.compute(context, position);
        return { result: 'match', data: { range }, remainingKeys: parseResult.remainingKeys };
    };
}

/**
 * 正規表現パターンでTextObjectを作成
 */
export function newRegexTextObject(config: {
    pattern: RegExp;
    partial: RegExp;
    compute: (context: Context, position: Position, variables: Record<string, string>) => Range;
}): TextObject {
    const keysParser = keysParserRegex(config.pattern, config.partial);

    return (context: Context, keys: string[], position: Position): TextObjectResult => {
        const parseResult = keysParser(keys);

        if (parseResult.result === 'noMatch') {
            return { result: 'noMatch' };
        }

        if (parseResult.result === 'needsMoreKey') {
            return { result: 'needsMoreKey' };
        }

        const range = config.compute(context, position, parseResult.variables);
        return { result: 'match', data: { range }, remainingKeys: parseResult.remainingKeys };
    };
}

export function newWholeLineTextObject(config: { keys: string[]; includeLineBreak: boolean }): TextObject {
    const baseTextObject = newTextObject({
        keys: config.keys,
        compute: (context: Context, position: Position) => {
            const line = context.editor.document.lineAt(position.line);
            return config.includeLineBreak ? line.rangeIncludingLineBreak : line.range;
        },
    });

    // newWholeLineTextObject の結果に isLinewise: true を付与
    return (context: Context, keys: string[], position: Position) => {
        const result = baseTextObject(context, keys, position);
        if (result.result === 'match') {
            return {
                result: 'match',
                data: { range: result.data.range, isLinewise: true },
                remainingKeys: result.remainingKeys,
            };
        }
        return result;
    };
}
