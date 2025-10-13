import tseslint from 'typescript-eslint';

export default tseslint.config(...tseslint.configs.recommended, {
    rules: {
        quotes: ['error', 'single', { avoidEscape: true }],
        curly: 'off',
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            },
        ],
    },
});
