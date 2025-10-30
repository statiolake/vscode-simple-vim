import type { Position } from 'vscode';
import type { Context } from '../context';
import { keysParserPrefix, keysParserRegex } from '../utils/keysParser/keysParser';
import type { Motion, MotionResult } from './motionTypes';

/**
 * 固定キーシーケンスでMotionを作成
 */
export function newMotion(config: {
    keys: string[];
    compute: (context: Context, position: Position) => Position;
}): Motion {
    const keysParser = keysParserPrefix(config.keys);

    return (context: Context, keys: string[], position: Position): MotionResult => {
        const parseResult = keysParser(keys);

        if (parseResult.result === 'noMatch') {
            return { result: 'noMatch' };
        }

        if (parseResult.result === 'needsMoreKey') {
            return { result: 'needsMoreKey' };
        }

        const requestedPosition = config.compute(context, position);
        const newPosition = context.document.validatePosition(requestedPosition);
        if (newPosition.character !== requestedPosition.character) {
            context.vimState.keptColumn = requestedPosition.character;
        } else {
            context.vimState.keptColumn = null;
        }
        return { result: 'match', position: requestedPosition, remainingKeys: parseResult.remainingKeys };
    };
}

/**
 * 正規表現パターンでMotionを作成
 */
export function newRegexMotion(config: {
    pattern: RegExp;
    partial: RegExp;
    compute: (context: Context, position: Position, variables: Record<string, string>) => Position;
}): Motion {
    const keysParser = keysParserRegex(config.pattern, config.partial);

    return (context: Context, keys: string[], position: Position): MotionResult => {
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
