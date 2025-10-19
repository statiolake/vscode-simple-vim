import * as vscode from 'vscode';
import { z } from 'zod';
import { newAction } from '../actionBuilder';
import type { Action } from '../actionTypes';

/**
 * カスタムキーバインディングの設定スキーマ
 */
const CustomBindingSchema = z.object({
    keys: z.array(z.string()).min(1, 'keys must have at least one element'),
    modes: z.array(z.enum(['normal', 'visual', 'visualLine', 'insert'])).optional(),
    commands: z
        .array(
            z.object({
                command: z.string(),
                args: z.unknown().optional(),
            }),
        )
        .min(1, 'commands must have at least one element'),
});

/**
 * カスタムキーバインディングからアクションを生成
 */
export function buildCustomActions(): Action[] {
    const config = vscode.workspace.getConfiguration('waltz');
    const customBindingsRaw = config.get<unknown>('customBindings', []);

    const actions: Action[] = [];

    // 全体の配列をバリデーション
    const bindingsResult = z.array(CustomBindingSchema).safeParse(customBindingsRaw);

    if (!bindingsResult.success) {
        const errorMessage = bindingsResult.error.issues
            .map((issue) => {
                const path = issue.path.length > 0 ? `[${issue.path.join('.')}]` : 'root';
                return `${path}: ${issue.message}`;
            })
            .join('\n');

        vscode.window.showErrorMessage(`Waltz: Invalid custom bindings configuration:\n${errorMessage}`);
        return actions;
    }

    const customBindings = bindingsResult.data;

    for (const binding of customBindings) {
        // modes が指定されていない場合は全モード対応
        const modes = binding.modes ?? ['normal', 'visual', 'visualLine', 'insert'];

        // アクションを作成
        const action = newAction({
            keys: binding.keys,
            modes,
            execute: async (_context) => {
                // 設定されたコマンドを順次実行
                for (const cmd of binding.commands) {
                    try {
                        await vscode.commands.executeCommand(cmd.command, cmd.args);
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        vscode.window.showErrorMessage(
                            `Waltz: Failed to execute command "${cmd.command}" for binding "${binding.keys.join('')}": ${errorMsg}`,
                        );
                        break;
                    }
                }
            },
        });

        actions.push(action);
    }

    if (customBindings.length > 0) {
        console.log(`Built ${customBindings.length} custom binding(s), created ${actions.length} action(s)`);
    }

    return actions;
}
