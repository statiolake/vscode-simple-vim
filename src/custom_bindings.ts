import * as vscode from 'vscode';
import type { Action } from './action_types';
import type { CustomBinding } from './custom_bindings_types';
import { Mode } from './modes_types';
import { parseKeysExact } from './parse_keys';

// Cache for custom bindings
let cachedCustomBindings: Action[] | null = null;

function modeStringToMode(modeStr: string): Mode | undefined {
    switch (modeStr) {
        case 'normal':
            return Mode.Normal;
        case 'visual':
            return Mode.Visual;
        case 'visualLine':
            return Mode.VisualLine;
        case 'insert':
            return Mode.Insert;
        default:
            return undefined;
    }
}

function parseCustomBinding(binding: CustomBinding): Action | undefined {
    // Validate keys
    if (!Array.isArray(binding.keys) || binding.keys.length === 0) {
        console.error('Custom binding must have non-empty keys array:', binding);
        return undefined;
    }

    // Validate commands
    if (!Array.isArray(binding.commands) || binding.commands.length === 0) {
        console.error('Custom binding must have non-empty commands array:', binding);
        return undefined;
    }

    // Validate each command
    for (const cmd of binding.commands) {
        if (typeof cmd.command !== 'string' || cmd.command.length === 0) {
            console.error('Custom binding command must have a valid command string:', cmd);
            return undefined;
        }
    }

    // Parse modes
    let modes: Mode[] | undefined;
    if (binding.modes) {
        if (!Array.isArray(binding.modes)) {
            console.error('Custom binding modes must be an array:', binding);
            return undefined;
        }

        const parsedModes: Mode[] = [];
        for (const modeStr of binding.modes) {
            const mode = modeStringToMode(modeStr);
            if (mode === undefined) {
                console.error(`Invalid mode "${modeStr}" in custom binding:`, binding);
                return undefined;
            }
            parsedModes.push(mode);
        }
        modes = parsedModes;
    }

    // Create action that executes commands sequentially
    return parseKeysExact(binding.keys, modes || [], async (_vimState, _editor) => {
        for (const cmd of binding.commands) {
            if (cmd.args !== undefined) {
                await vscode.commands.executeCommand(cmd.command, cmd.args);
            } else {
                await vscode.commands.executeCommand(cmd.command);
            }
        }
    });
}

function loadCustomBindingsFromConfig(): Action[] {
    const config = vscode.workspace.getConfiguration('simple-vim');
    const customBindings = config.get<CustomBinding[]>('customBindings');

    if (!customBindings || !Array.isArray(customBindings)) {
        return [];
    }

    const actions: Action[] = [];
    for (const binding of customBindings) {
        const action = parseCustomBinding(binding);
        if (action) {
            actions.push(action);
        }
    }

    return actions;
}

export function getCustomBindings(): Action[] {
    if (cachedCustomBindings === null) {
        cachedCustomBindings = loadCustomBindingsFromConfig();
    }
    return cachedCustomBindings;
}

export function reloadCustomBindings(): void {
    cachedCustomBindings = loadCustomBindingsFromConfig();
}
