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
    private cache: Map<string, CommentConfig> = new Map();

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
                    if (config?.comments?.lineComment == null) continue;
                    this.cache.set(language.id, { lineComment: config.comments.lineComment });
                } catch {
                    // エラーは無視
                }
            }
        }
    }

    /**
     * 指定された言語のコメント設定を取得
     */
    getConfig(languageId: string): CommentConfig | null {
        const cache = this.cache.get(languageId);
        if (cache != null) return cache;
        // キャッシュにない場合は念のため再読み込みを試みる (読み込み順序の問題かもしれないので)
        this.loadAllLanguageConfigs();
        return this.cache.get(languageId) || null;
    }
}
