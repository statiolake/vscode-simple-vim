import * as fs from 'node:fs';
import * as path from 'node:path';

import * as jsonc from 'jsonc-parser';
import * as vscode from 'vscode';

// VSCode の言語設定からコメント文字を取得する実装
// 参考: https://stackoverflow.com/questions/75096195/vscode-extension-api-get-comment-type-per-language-id
// 参考: https://code.visualstudio.com/api/language-extensions/language-configuration-guide

interface LanguageContribution {
    id: string;
    configuration?: string;
}

interface CommentConfig {
    lineComment?: string;
}

export class CommentConfigProvider {
    private cache: Map<string, CommentConfig | null> = new Map();

    constructor() {
        this.loadAllLanguageConfigs();
    }

    /**
     * インストールされている拡張機能をすべて眺めてコメント設定を読み込む
     */
    private loadAllLanguageConfigs(): void {
        for (const extension of vscode.extensions.all) {
            const packageJSON = extension.packageJSON;
            if (!packageJSON.contributes?.languages) continue;

            const languages = packageJSON.contributes.languages as LanguageContribution[];
            for (const language of languages) {
                if (!language.configuration || this.cache.has(language.id)) continue;

                const configPath = path.join(extension.extensionPath, language.configuration);

                try {
                    const configContent = fs.readFileSync(configPath, 'utf-8');
                    // JSONC (JSON with Comments) をパース
                    const config = jsonc.parse(configContent);

                    if (config?.comments?.lineComment) {
                        this.cache.set(language.id, { lineComment: config.comments.lineComment });
                    } else {
                        this.cache.set(language.id, null);
                    }
                } catch {
                    // エラーは無視
                    this.cache.set(language.id, null);
                }
            }
        }
    }

    /**
     * 指定された言語のコメント設定を取得
     */
    getCommentConfig(languageId: string): CommentConfig | null {
        return this.cache.get(languageId) || null;
    }

    /**
     * 指定された言語の行コメント文字を取得
     */
    getLineComment(languageId: string): string {
        return this.cache.get(languageId)?.lineComment || '';
    }
}
