import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { Position } from 'vscode';
import { findMatchingTag } from '../../utils/positionFinder';

suite('findMatchingTag', () => {
    test('should find matching tag for simple tag', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '<meta>hello</meta>' });
        const position = new Position(0, 7); // cursor on 'h' in "hello"

        const result = findMatchingTag(doc, position);

        assert.ok(result, 'Result should be defined');
        assert.deepStrictEqual(result.innerRange.start, new Position(0, 6)); // after >
        assert.deepStrictEqual(result.innerRange.end, new Position(0, 11)); // before <
        assert.deepStrictEqual(result.outerRange.start, new Position(0, 0)); // <
        assert.deepStrictEqual(result.outerRange.end, new Position(0, 18)); // after >
    });

    test('should find matching tag with attributes', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '<meta title="hello">foo</meta>' });
        const position = new Position(0, 22); // cursor on 'f' in "foo"

        const result = findMatchingTag(doc, position);

        assert.ok(result, 'Result should be defined');
        assert.deepStrictEqual(result.innerRange.start, new Position(0, 20)); // after >
        assert.deepStrictEqual(result.innerRange.end, new Position(0, 23)); // before <
    });

    test('should handle nested tags', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '<div><span>text</span></div>' });
        const position = new Position(0, 12); // cursor on 't' in "text"

        const result = findMatchingTag(doc, position);

        assert.ok(result, 'Result should be defined');
        // Should match the inner <span> tag
        assert.deepStrictEqual(result.innerRange.start, new Position(0, 11)); // after >
        assert.deepStrictEqual(result.innerRange.end, new Position(0, 15)); // before <
    });

    test('should handle multiline tags', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '<div>\n  hello\n</div>' });
        const position = new Position(1, 3); // cursor on 'h' in "hello"

        const result = findMatchingTag(doc, position);

        assert.ok(result, 'Result should be defined');
        assert.deepStrictEqual(result.innerRange.start, new Position(0, 5)); // after >
        assert.deepStrictEqual(result.innerRange.end, new Position(2, 0)); // before <
    });

    test('should ignore self-closing tags', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '<div><br />content</div>' });
        const position = new Position(0, 14); // cursor between '>' and 'c' in "content"

        const result = findMatchingTag(doc, position);

        assert.ok(result, 'Result should be defined');
        // Should match <div>, not <br />
        assert.deepStrictEqual(result.innerRange.start, new Position(0, 5)); // after <div>
        assert.deepStrictEqual(result.innerRange.end, new Position(0, 18)); // before </div>
    });

    test('should return undefined for no matching tag', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        const position = new Position(0, 5);

        const result = findMatchingTag(doc, position);

        assert.strictEqual(result, undefined);
    });
});
