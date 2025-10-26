import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { Range } from 'vscode';
import { filterRangeByPattern, splitRangeByPattern } from '../../utils/rangeUtils';

suite('splitRangeByPattern', () => {
    test('should split text by comma separator', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello, world' });
        const range = new Range(0, 0, 0, 12);
        const pattern = /, /;

        const result = splitRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 2);
        assert.strictEqual(doc.getText(result[0]), 'hello');
        assert.strictEqual(doc.getText(result[1]), 'world');
    });

    test('should split text by multiple separators', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'one, two, three' });
        const range = new Range(0, 0, 0, 15);
        const pattern = /, /;

        const result = splitRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 3);
        assert.strictEqual(doc.getText(result[0]), 'one');
        assert.strictEqual(doc.getText(result[1]), 'two');
        assert.strictEqual(doc.getText(result[2]), 'three');
    });

    test('should split text by regex pattern', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'a:b;c:d' });
        const range = new Range(0, 0, 0, 7);
        const pattern = /[:;]/;

        const result = splitRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 4);
        assert.strictEqual(doc.getText(result[0]), 'a');
        assert.strictEqual(doc.getText(result[1]), 'b');
        assert.strictEqual(doc.getText(result[2]), 'c');
        assert.strictEqual(doc.getText(result[3]), 'd');
    });

    test('should return original range when no match', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        const range = new Range(0, 0, 0, 11);
        const pattern = /,/;

        const result = splitRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 1);
        assert.strictEqual(doc.getText(result[0]), 'hello world');
    });

    test('should handle empty range and preserve cursor position', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello' });
        const range = new Range(0, 2, 0, 2); // カーソル位置
        const pattern = /, /;

        const result = splitRangeByPattern(doc, range, pattern);

        // 空の範囲でもカーソル位置を保持する（元の範囲を返す）
        assert.strictEqual(result.length, 1);
        assert.strictEqual(doc.getText(result[0]), '');
        assert.deepStrictEqual(result[0], range);
    });

    test('should handle pattern at start', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: ', hello' });
        const range = new Range(0, 0, 0, 7);
        const pattern = /, /;

        const result = splitRangeByPattern(doc, range, pattern);

        // 先頭にマッチがある場合、非空パターンなので空の範囲も含める
        assert.strictEqual(result.length, 2);
        assert.strictEqual(doc.getText(result[0]), '');
        assert.strictEqual(doc.getText(result[1]), 'hello');
    });

    test('should handle pattern at end', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello, ' });
        const range = new Range(0, 0, 0, 7);
        const pattern = /, /;

        const result = splitRangeByPattern(doc, range, pattern);

        // 末尾にマッチがある場合、非空パターンなので空の範囲も含める
        assert.strictEqual(result.length, 2);
        assert.strictEqual(doc.getText(result[0]), 'hello');
        assert.strictEqual(doc.getText(result[1]), '');
    });

    test('should handle consecutive patterns', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'a, , b' });
        const range = new Range(0, 0, 0, 6);
        const pattern = /, /;

        const result = splitRangeByPattern(doc, range, pattern);

        // 連続するマッチの場合、非空パターンなので間の空も含める
        assert.strictEqual(result.length, 3);
        assert.strictEqual(doc.getText(result[0]), 'a');
        assert.strictEqual(doc.getText(result[1]), '');
        assert.strictEqual(doc.getText(result[2]), 'b');
    });

    test('should handle whitespace splitting', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'one two three' });
        const range = new Range(0, 0, 0, 13);
        const pattern = /\s+/;

        const result = splitRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 3);
        assert.strictEqual(doc.getText(result[0]), 'one');
        assert.strictEqual(doc.getText(result[1]), 'two');
        assert.strictEqual(doc.getText(result[2]), 'three');
    });

    test('should handle newline splitting', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'line1\nline2\nline3' });
        const range = new Range(0, 0, 2, 5);
        const pattern = /\n/;

        const result = splitRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 3);
        assert.strictEqual(doc.getText(result[0]), 'line1');
        assert.strictEqual(doc.getText(result[1]), 'line2');
        assert.strictEqual(doc.getText(result[2]), 'line3');
    });

    test('should work with non-global regex', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'a,b,c' });
        const range = new Range(0, 0, 0, 5);
        const pattern = /,/; // non-global

        const result = splitRangeByPattern(doc, range, pattern);

        // Should still split all occurrences
        assert.strictEqual(result.length, 3);
        assert.strictEqual(doc.getText(result[0]), 'a');
        assert.strictEqual(doc.getText(result[1]), 'b');
        assert.strictEqual(doc.getText(result[2]), 'c');
    });

    test('should handle partial range selection', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'prefix hello, world suffix' });
        const range = new Range(0, 7, 0, 19); // "hello, world"
        const pattern = /, /;

        const result = splitRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 2);
        assert.strictEqual(doc.getText(result[0]), 'hello');
        assert.strictEqual(doc.getText(result[1]), 'world');
    });

    test('should handle empty pattern on empty range', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello' });
        const range = new Range(0, 2, 0, 2); // カーソル位置（空の範囲）
        const pattern = /(?:)/; // 空のパターン（全位置にマッチ）

        const result = splitRangeByPattern(doc, range, pattern);

        // 空の範囲（長さ0）に対しては、分割できないので元の範囲を返す
        assert.strictEqual(result.length, 1);
        assert.strictEqual(doc.getText(result[0]), '');
        assert.deepStrictEqual(result[0], range);
    });

    test('should handle empty pattern on non-empty range', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'abc' });
        const range = new Range(0, 0, 0, 3); // "abc"
        const pattern = /(?:)/; // 空のパターン（全位置にマッチ）

        const result = splitRangeByPattern(doc, range, pattern);

        // 空のパターンは |a|b|c| の 5 箇所でsplit（重複位置は避ける）
        // split結果: [a][b][c][] の 4つ
        assert.strictEqual(result.length, 4);
        assert.strictEqual(doc.getText(result[0]), 'a');
        assert.strictEqual(doc.getText(result[1]), 'b');
        assert.strictEqual(doc.getText(result[2]), 'c');
        assert.strictEqual(doc.getText(result[3]), '');
    });

    test('should handle dot pattern (any character) as separator', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'abc' });
        const range = new Range(0, 0, 0, 3); // "abc"
        const pattern = /./; // 任意の1文字にマッチ

        const result = splitRangeByPattern(doc, range, pattern);

        // . は各文字 (a, b, c) にマッチするので、|a|b|c| の 4 箇所に分割
        // 空の範囲も含めて全て返す
        assert.strictEqual(result.length, 4);
        assert.strictEqual(doc.getText(result[0]), ''); // 最初の空
        assert.strictEqual(doc.getText(result[1]), ''); // aとbの間の空
        assert.strictEqual(doc.getText(result[2]), ''); // bとcの間の空
        assert.strictEqual(doc.getText(result[3]), ''); // 最後の空
    });
});

suite('filterRangeByPattern', () => {
    test('should extract words from text', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello, world' });
        const range = new Range(0, 0, 0, 12);
        const pattern = /\w+/;

        const result = filterRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 2);
        assert.strictEqual(doc.getText(result[0]), 'hello');
        assert.strictEqual(doc.getText(result[1]), 'world');
    });

    test('should extract numbers from text', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'abc123def456' });
        const range = new Range(0, 0, 0, 12);
        const pattern = /\d+/;

        const result = filterRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 2);
        assert.strictEqual(doc.getText(result[0]), '123');
        assert.strictEqual(doc.getText(result[1]), '456');
    });

    test('should extract quoted strings', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'foo "bar" baz "qux"' });
        const range = new Range(0, 0, 0, 19);
        const pattern = /"[^"]*"/;

        const result = filterRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 2);
        assert.strictEqual(doc.getText(result[0]), '"bar"');
        assert.strictEqual(doc.getText(result[1]), '"qux"');
    });

    test('should return empty array when no match', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        const range = new Range(0, 0, 0, 11);
        const pattern = /\d+/;

        const result = filterRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 0);
    });

    test('should handle empty range with non-matching pattern', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello' });
        const range = new Range(0, 2, 0, 2); // カーソル位置
        const pattern = /\w+/; // 単語にマッチするが、カーソル位置（長さ0）はマッチしない

        const result = filterRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 0);
    });

    test('should handle empty range with empty pattern', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello' });
        const range = new Range(0, 2, 0, 2); // カーソル位置（空の範囲）
        const pattern = /(?:)/; // 空のパターン（全位置にマッチ）

        const result = filterRangeByPattern(doc, range, pattern);

        // 空の範囲（長さ0）に対して空のパターンは1回マッチ
        assert.strictEqual(result.length, 1);
        assert.strictEqual(doc.getText(result[0]), '');
    });

    test('should handle empty pattern on non-empty range', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'abc' });
        const range = new Range(0, 0, 0, 3); // "abc"
        const pattern = /(?:)/; // 空のパターン（全位置にマッチ）

        const result = filterRangeByPattern(doc, range, pattern);

        // 空のパターンは |a|b|c| の 4 箇所（両端含む）にマッチ
        assert.strictEqual(result.length, 4);
        for (const r of result) {
            assert.strictEqual(doc.getText(r), '');
        }
    });

    test('should extract all characters matching class', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'a1b2c3' });
        const range = new Range(0, 0, 0, 6);
        const pattern = /[a-z]/;

        const result = filterRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 3);
        assert.strictEqual(doc.getText(result[0]), 'a');
        assert.strictEqual(doc.getText(result[1]), 'b');
        assert.strictEqual(doc.getText(result[2]), 'c');
    });

    test('should extract email-like patterns', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'Contact: user@example.com or admin@test.org' });
        const range = new Range(0, 0, 0, 44);
        const pattern = /[\w.]+@[\w.]+/;

        const result = filterRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 2);
        assert.strictEqual(doc.getText(result[0]), 'user@example.com');
        assert.strictEqual(doc.getText(result[1]), 'admin@test.org');
    });

    test('should extract single character', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'a b c' });
        const range = new Range(0, 0, 0, 5);
        const pattern = /[abc]/;

        const result = filterRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 3);
        assert.strictEqual(doc.getText(result[0]), 'a');
        assert.strictEqual(doc.getText(result[1]), 'b');
        assert.strictEqual(doc.getText(result[2]), 'c');
    });

    test('should work with non-global regex', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'a1b2c3' });
        const range = new Range(0, 0, 0, 6);
        const pattern = /\d/; // non-global

        const result = filterRangeByPattern(doc, range, pattern);

        // Should still match all occurrences
        assert.strictEqual(result.length, 3);
        assert.strictEqual(doc.getText(result[0]), '1');
        assert.strictEqual(doc.getText(result[1]), '2');
        assert.strictEqual(doc.getText(result[2]), '3');
    });

    test('should handle overlapping patterns correctly', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'aaa' });
        const range = new Range(0, 0, 0, 3);
        const pattern = /aa/;

        const result = filterRangeByPattern(doc, range, pattern);

        // Should match non-overlapping occurrences
        assert.strictEqual(result.length, 1);
        assert.strictEqual(doc.getText(result[0]), 'aa');
    });

    test('should extract camelCase words', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'thisIsCamelCase' });
        const range = new Range(0, 0, 0, 15);
        const pattern = /[A-Z][a-z]*/;

        const result = filterRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 3);
        assert.strictEqual(doc.getText(result[0]), 'Is');
        assert.strictEqual(doc.getText(result[1]), 'Camel');
        assert.strictEqual(doc.getText(result[2]), 'Case');
    });

    test('should handle partial range selection', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'prefix hello, world suffix' });
        const range = new Range(0, 7, 0, 19); // "hello, world"
        const pattern = /\w+/;

        const result = filterRangeByPattern(doc, range, pattern);

        assert.strictEqual(result.length, 2);
        assert.strictEqual(doc.getText(result[0]), 'hello');
        assert.strictEqual(doc.getText(result[1]), 'world');
    });
});
