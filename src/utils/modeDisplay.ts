import * as vscode from 'vscode';
import type { Mode } from '../modesTypes';

const defaultModeDisplays: Record<Mode, string> = {
    normal: '-- NORMAL --',
    insert: '-- INSERT --',
    visual: '-- VISUAL --',
    visualLine: '-- VISUAL LINE --',
};

function getModeDisplayLabelConfigKey(mode: Mode): string {
    return `waltz.modeDisplay.${mode}.label`;
}

export function getModeDisplayText(mode: Mode): string {
    const configKey = getModeDisplayLabelConfigKey(mode);
    const config = vscode.workspace.getConfiguration();
    const displayText = config.get<string>(configKey, defaultModeDisplays[mode]);

    return displayText ?? defaultModeDisplays[mode];
}
