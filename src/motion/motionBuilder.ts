import type * as vscode from 'vscode';
import type { Context } from '../context';
import { keysParserPrefix, keysParserRegex } from '../utils/keysParser/keysParser';
import type { Motion, MotionResult } from './motionTypes';

/**
 * 固定キーシーケンスでMotionを作成
 */
export function newMotion(config: {
    keys: string[];
    compute: (context: Context, position: vscode.Position) => vscode.Position;
}): Motion {
    const keysParser = keysParserPrefix(config.keys);

    return (context: Context, keys: string[], position: vscode.Position): MotionResult => {
        const parseResult = keysParser(keys);

        if (parseResult.result === 'noMatch') {
            return { result: 'noMatch' };
        }

        if (parseResult.result === 'needsMoreKey') {
            return { result: 'needsMoreKey' };
        }

        const newPosition = config.compute(context, position);
        return { result: 'match', position: newPosition, remainingKeys: parseResult.remainingKeys };
    };
}

/**
 * 正規表現パターンでMotionを作成
 */
export function newRegexMotion(config: {
    pattern: RegExp;
    partial: RegExp;
    compute: (context: Context, position: vscode.Position, variables: Record<string, string>) => vscode.Position;
}): Motion {
    const keysParser = keysParserRegex(config.pattern, config.partial);

    return (context: Context, keys: string[], position: vscode.Position): MotionResult => {
        const parseResult = keysParser(keys);

        if (parseResult.result === 'noMatch') {
            return { result: 'noMatch' };
        }

        if (parseResult.result === 'needsMoreKey') {
            return { result: 'needsMoreKey' };
        }

        const newPosition = config.compute(context, position, parseResult.variables);
        return { result: 'match', position: newPosition, remainingKeys: parseResult.remainingKeys };
    };
}
