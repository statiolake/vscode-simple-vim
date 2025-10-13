import type * as vscode from 'vscode';
import type { ParseKeysStatus } from './parse_keys_types';
import type { VimState } from './vim_state_types';

export type Action = (vimState: VimState, keys: string[], editor: vscode.TextEditor) => ParseKeysStatus;
