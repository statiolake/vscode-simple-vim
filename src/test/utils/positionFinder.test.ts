import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { Position } from 'vscode';
import {
    findAdjacentPosition,
    findCurrentArgument,
    findDocumentEnd,
    findDocumentStart,
    findInsideBalancedPairs,
    findLineEnd,
    findLineStart,
    findLineStartAfterIndent,
    findMatchingTag,
    findNearerPosition,
    findParagraphBoundary,
    findWordBoundary,
} from '../../utils/positionFinder';

suite('findMatchingTag', () => {
    test('should find matching tag for simple tag', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '<meta>hello</meta>' });
        // Position (0, 7): between 'h' and 'e' in "hello"
        const position = new Position(0, 7);

        const result = findMatchingTag(doc, position);

        // innerRange.start = (0, 6): between '>' and 'h'
        assert.deepStrictEqual(result?.innerRange.start, new Position(0, 6));
        // innerRange.end = (0, 11): between 'o' and '<'
        assert.deepStrictEqual(result?.innerRange.end, new Position(0, 11));
        // outerRange.start = (0, 0): before '<'
        assert.deepStrictEqual(result?.outerRange.start, new Position(0, 0));
        // outerRange.end = (0, 18): after '>'
        assert.deepStrictEqual(result?.outerRange.end, new Position(0, 18));
    });

    test('should find matching tag with attributes', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '<meta title="hello">foo</meta>' });
        // Position (0, 22): between 'o' and 'o' in "foo"
        const position = new Position(0, 22);

        const result = findMatchingTag(doc, position);

        // innerRange.start = (0, 20): between '>' and 'f'
        assert.deepStrictEqual(result?.innerRange.start, new Position(0, 20));
        // innerRange.end = (0, 23): between 'o' and '<'
        assert.deepStrictEqual(result?.innerRange.end, new Position(0, 23));
        // outerRange.start = (0, 0): before '<'
        assert.deepStrictEqual(result?.outerRange.start, new Position(0, 0));
        // outerRange.end = (0, 30): after '>'
        assert.deepStrictEqual(result?.outerRange.end, new Position(0, 30));
    });

    test('should handle nested tags', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '<div><span>text</span></div>' });
        // Position (0, 12): between 't' and 'e' in "text"
        const position = new Position(0, 12);

        const result = findMatchingTag(doc, position);

        // Should match the inner <span> tag, not <div>
        // innerRange.start = (0, 11): between '>' and 't'
        assert.deepStrictEqual(result?.innerRange.start, new Position(0, 11));
        // innerRange.end = (0, 15): between 't' and '<'
        assert.deepStrictEqual(result?.innerRange.end, new Position(0, 15));
        // outerRange.start = (0, 5): before '<' of <span>
        assert.deepStrictEqual(result?.outerRange.start, new Position(0, 5));
        // outerRange.end = (0, 22): after '>' of </span>
        assert.deepStrictEqual(result?.outerRange.end, new Position(0, 22));
    });

    test('should handle multiline tags', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '<div>\n  hello\n</div>' });
        // Position (1, 3): between 'h' and 'e' in "hello"
        const position = new Position(1, 3);

        const result = findMatchingTag(doc, position);

        // innerRange.start = (0, 5): between '>' and newline
        assert.deepStrictEqual(result?.innerRange.start, new Position(0, 5));
        // innerRange.end = (2, 0): before '<'
        assert.deepStrictEqual(result?.innerRange.end, new Position(2, 0));
    });

    test('should ignore self-closing tags', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '<div><br />content</div>' });
        // Position (0, 14): between 'c' and 'o' in "content"
        const position = new Position(0, 14);

        const result = findMatchingTag(doc, position);

        assert.ok(result !== undefined);
        // Should match <div>, not <br />
        // innerRange.start = (0, 5): between '>' of <div> and '<' of <br
        assert.deepStrictEqual(result.innerRange.start, new Position(0, 5));
        // innerRange.end = (0, 18): between '>' of <br /> and '<' of </div>
        assert.deepStrictEqual(result.innerRange.end, new Position(0, 18));
    });

    test('should return undefined for no matching tag', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 5): between 'o' and space
        const position = new Position(0, 5);

        const result = findMatchingTag(doc, position);

        assert.strictEqual(result, undefined);
    });
});

suite('findAdjacentPosition', () => {
    test('should find position before', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 5): between 'o' and space
        const position = new Position(0, 5);

        const result = findAdjacentPosition(doc, 'before', position);

        // Result should be (0, 4): between 'l' and 'o'
        assert.deepStrictEqual(result, new Position(0, 4));
    });

    test('should find position after', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 5): between 'o' and space
        const position = new Position(0, 5);

        const result = findAdjacentPosition(doc, 'after', position);

        // Result should be (0, 6): between ' ' and 'w'
        assert.deepStrictEqual(result, new Position(0, 6));
    });

    test('should handle boundary at document start', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello' });
        // Position (0, 0): before 'h'
        const position = new Position(0, 0);

        const result = findAdjacentPosition(doc, 'before', position);

        // Should clamp to document start: (0, 0)
        assert.deepStrictEqual(result, new Position(0, 0));
    });

    test('should handle boundary at document end', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello' });
        // Position (0, 5): after 'o'
        const position = new Position(0, 5);

        const result = findAdjacentPosition(doc, 'after', position);

        // Should clamp to document end: (0, 5)
        assert.deepStrictEqual(result, new Position(0, 5));
    });
});

suite('findNearerPosition', () => {
    test('should find character before position', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 5): between 'o' and space
        const position = new Position(0, 5);
        const predicate = (ch: string) => ch === 'o';

        const result = findNearerPosition(doc, predicate, 'before', position, { withinLine: false });

        // Returns position where the previous character matches predicate
        assert.deepStrictEqual(result, new Position(0, 5));
    });

    test('should find character after position', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 5): between 'o' and space
        const position = new Position(0, 5);
        const predicate = (ch: string) => ch === 'w';

        const result = findNearerPosition(doc, predicate, 'after', position, { withinLine: false });

        // Result should be (0, 6): between ' ' and 'w'
        assert.deepStrictEqual(result, new Position(0, 6));
    });

    test('should return undefined if character not found', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 5): between 'o' and space
        const position = new Position(0, 5);
        const predicate = (ch: string) => ch === 'z';

        const result = findNearerPosition(doc, predicate, 'before', position, { withinLine: false });

        assert.strictEqual(result, undefined);
    });

    test('should respect withinLine option', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello\nworld' });
        // Position (1, 2): between 'w' and 'o' in "world"
        const position = new Position(1, 2);
        const predicate = (ch: string) => ch === 'h';

        const result = findNearerPosition(doc, predicate, 'before', position, { withinLine: true });

        // Should not find 'h' because it's on a different line and withinLine=true
        assert.strictEqual(result, undefined);
    });

    test('should respect maxOffsetWidth option', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 5): between 'o' and space
        const position = new Position(0, 5);
        const predicate = (ch: string) => ch === 'h';

        const result = findNearerPosition(doc, predicate, 'before', position, {
            withinLine: false,
            maxOffsetWidth: 2, // Only search within 2 character positions
        });

        // 'h' is 5 positions before, so should not be found
        assert.strictEqual(result, undefined);
    });
});

suite('Line-related functions', () => {
    test('findLineStart should return start of current line', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 5): between 'o' and space
        const position = new Position(0, 5);

        const result = findLineStart(doc, position);

        // Result should be (0, 0): before 'h'
        assert.deepStrictEqual(result, new Position(0, 0));
    });

    test('findLineStart should work on different lines', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'line1\nline2\nline3' });
        // Position (1, 3): between 'n' and 'e' in "line2"
        const position = new Position(1, 3);

        const result = findLineStart(doc, position);

        // Result should be (1, 0): before 'l'
        assert.deepStrictEqual(result, new Position(1, 0));
    });

    test('findLineEnd should return end of current line', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 5): between 'o' and space
        const position = new Position(0, 5);

        const result = findLineEnd(doc, position);

        // Result should be (0, 11): after 'd'
        assert.deepStrictEqual(result, new Position(0, 11));
    });

    test('findLineEnd should work on different lines', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'line1\nline2\nline3' });
        // Position (1, 0): before 'l' in "line2"
        const position = new Position(1, 0);

        const result = findLineEnd(doc, position);

        // Result should be (1, 5): after '2'
        assert.deepStrictEqual(result, new Position(1, 5));
    });

    test('findLineStartAfterIndent should skip leading whitespace', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '    hello world' });
        // Position (0, 0): before first space
        const position = new Position(0, 0);

        const result = findLineStartAfterIndent(doc, position);

        // Result should be (0, 4): between spaces and 'h'
        assert.deepStrictEqual(result, new Position(0, 4));
    });

    test('findLineStartAfterIndent should handle no indentation', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 0): before 'h'
        const position = new Position(0, 0);

        const result = findLineStartAfterIndent(doc, position);

        // Result should be (0, 0): no indentation to skip
        assert.deepStrictEqual(result, new Position(0, 0));
    });

    test('findLineStartAfterIndent should work on indented lines', async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: 'line1\n  line2\n    line3',
        });
        // Position (2, 0): before first space in "    line3"
        const position = new Position(2, 0);

        const result = findLineStartAfterIndent(doc, position);

        // Result should be (2, 4): between spaces and 'l'
        assert.deepStrictEqual(result, new Position(2, 4));
    });
});

suite('Document boundary functions', () => {
    test('findDocumentStart should return position 0,0', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello\nworld' });

        const result = findDocumentStart(doc);

        // Result should be (0, 0): before 'h'
        assert.deepStrictEqual(result, new Position(0, 0));
    });

    test('findDocumentStart should work regardless of content', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '' });

        const result = findDocumentStart(doc);

        assert.deepStrictEqual(result, new Position(0, 0));
    });

    test('findDocumentEnd should return end of document', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });

        const result = findDocumentEnd(doc);

        // Result should be (0, 11): after 'd'
        assert.deepStrictEqual(result, new Position(0, 11));
    });

    test('findDocumentEnd should work on multiline documents', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'line1\nline2\nline3' });

        const result = findDocumentEnd(doc);

        // Result should be (2, 5): after '3'
        assert.deepStrictEqual(result, new Position(2, 5));
    });

    test('findDocumentEnd should work on empty documents', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '' });

        const result = findDocumentEnd(doc);

        // Result should be (0, 0): empty document
        assert.deepStrictEqual(result, new Position(0, 0));
    });
});

suite('findWordBoundary', () => {
    test('should find next word boundary in nearer mode', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 0): before 'h'
        const position = new Position(0, 0);
        const isBoundary = (char1: string, char2: string) => /\s/.test(char1) !== /\s/.test(char2);

        const result = findWordBoundary(doc, 'nearer', 'after', position, isBoundary);

        // Should find the boundary between 'o' and space at position (0, 5)
        assert.ok(result !== undefined);
    });

    test('should find previous word boundary', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 11): after 'd'
        const position = new Position(0, 11);
        const isBoundary = (char1: string, char2: string) => /\s/.test(char1) !== /\s/.test(char2);

        const result = findWordBoundary(doc, 'nearer', 'before', position, isBoundary);

        // Should find the boundary between space and 'w'
        assert.ok(result !== undefined);
    });

    test('should work with custom boundary predicate', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'camelCaseWord' });
        // Position (0, 0): before 'c'
        const position = new Position(0, 0);
        const isBoundary = (char1: string, char2: string) => {
            const char1Lower = char1.toLowerCase();
            const char2Lower = char2.toLowerCase();
            // True when transition from lowercase to uppercase
            return char1Lower === char1 && char2Lower !== char2;
        };

        const result = findWordBoundary(doc, 'further', 'after', position, isBoundary);

        // Should find camelCase boundary
        assert.ok(result !== undefined);
    });
});

suite('findParagraphBoundary', () => {
    test('should find next paragraph boundary', async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: 'paragraph 1 line 1\nparagraph 1 line 2\n\nparagraph 2 line 1',
        });
        // Position (0, 0): before 'p' in first paragraph
        const position = new Position(0, 0);

        const result = findParagraphBoundary(doc, 'after', position);

        // Should move to empty line (line 2)
        assert.deepStrictEqual(result.line, 2);
    });

    test('should find previous paragraph boundary', async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: 'paragraph 1\n\nparagraph 2\n',
        });
        // Position (2, 0): before 'p' in "paragraph 2"
        const position = new Position(2, 0);

        const result = findParagraphBoundary(doc, 'before', position);

        // Should move to line 1 (empty line)
        assert.deepStrictEqual(result.line, 1);
    });

    test('should handle single line paragraphs', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'line1\n\nline3\n\nline5' });
        // Position (0, 0): before 'l' in "line1"
        const position = new Position(0, 0);

        const result = findParagraphBoundary(doc, 'after', position);

        // Should find next paragraph boundary (empty line at 1)
        assert.deepStrictEqual(result.line, 1);
    });

    test('should stop at document boundaries', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'single line' });
        // Position (0, 0): before 's'
        const position = new Position(0, 0);

        const result = findParagraphBoundary(doc, 'after', position);

        // Should stay at line 0 (no other paragraphs)
        assert.deepStrictEqual(result.line, 0);
    });
});

suite('findInsideBalancedPairs', () => {
    test('should find balanced parentheses', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '(hello)' });
        // Position (0, 3): between 'l' and 'l' in "hello"
        const position = new Position(0, 3);

        const result = findInsideBalancedPairs(doc, position, '(', ')');

        assert.ok(result !== undefined);
        // result.start = (0, 1): between '(' and 'h'
        assert.deepStrictEqual(result.start, new Position(0, 1));
        // result.end = (0, 6): between 'o' and ')'
        assert.deepStrictEqual(result.end, new Position(0, 6));
    });

    test('should find balanced brackets', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '[foo bar]' });
        // Position (0, 4): between space and 'b' in "[foo bar]"
        const position = new Position(0, 4);

        const result = findInsideBalancedPairs(doc, position, '[', ']');

        assert.ok(result !== undefined);
        // result.start = (0, 1): between '[' and 'f'
        assert.deepStrictEqual(result.start, new Position(0, 1));
        // result.end = (0, 8): between 'r' and ']'
        assert.deepStrictEqual(result.end, new Position(0, 8));
    });

    test('should find balanced braces', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '{key: value}' });
        // Position (0, 6): between ':' and space in "{key: value}"
        const position = new Position(0, 6);

        const result = findInsideBalancedPairs(doc, position, '{', '}');

        assert.ok(result !== undefined);
        // result.start = (0, 1): between '{' and 'k'
        assert.deepStrictEqual(result.start, new Position(0, 1));
        // result.end = (0, 11): between 'e' and '}'
        assert.deepStrictEqual(result.end, new Position(0, 11));
    });

    test('should handle nested pairs', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '(outer (inner) text)' });
        // Position (0, 8): between space and '(' of "(inner)"
        const position = new Position(0, 8);

        const result = findInsideBalancedPairs(doc, position, '(', ')');

        assert.ok(result !== undefined);
        // Should find the inner pair, not the outer one
        // result.start = (0, 8): between '(' and 'i'
        assert.deepStrictEqual(result.start, new Position(0, 8));
        // result.end = (0, 13): between 'r' and ')'
        assert.deepStrictEqual(result.end, new Position(0, 13));
    });

    test('should return undefined when no balanced pair found', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'no pairs here' });
        // Position (0, 5): between 'a' and 'i' in "pairs"
        const position = new Position(0, 5);

        const result = findInsideBalancedPairs(doc, position, '(', ')');

        assert.strictEqual(result, undefined);
    });

    test('should handle unbalanced pairs', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: '(unclosed' });
        // Position (0, 3): between 'n' and 'c'
        const position = new Position(0, 3);

        const result = findInsideBalancedPairs(doc, position, '(', ')');

        assert.strictEqual(result, undefined);
    });

    test('should work with multiline content', async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: '(\nline1\nline2\n)',
        });
        // Position (1, 2): between 'n' and 'e' in "line1"
        const position = new Position(1, 2);

        const result = findInsideBalancedPairs(doc, position, '(', ')');

        assert.ok(result !== undefined);
        // result.start = (0, 1): between '(' and newline
        assert.deepStrictEqual(result.start, new Position(0, 1));
        // result.end = (3, 0): before ')'
        assert.deepStrictEqual(result.end, new Position(3, 0));
    });
});

suite('findCurrentArgument', () => {
    test('should find first argument', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'func(a, b, c)' });
        // Position (0, 6): between 'a' and ','
        const position = new Position(0, 6);

        const result = findCurrentArgument(doc, position);

        assert.ok(result !== undefined);
        // Should select 'a' (with leading space stripped)
        assert.deepStrictEqual(result.start, new Position(0, 5));
        assert.deepStrictEqual(result.end, new Position(0, 6));
    });

    test('should find middle argument', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'func(a, b, c)' });
        // Position (0, 9): between 'b' and ','
        const position = new Position(0, 9);

        const result = findCurrentArgument(doc, position);

        assert.ok(result !== undefined);
        // Should select 'b' (with spaces stripped)
        assert.deepStrictEqual(result.start, new Position(0, 8));
        assert.deepStrictEqual(result.end, new Position(0, 9));
    });

    test('should find last argument', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'func(a, b, c)' });
        // Position (0, 12): between 'c' and ')'
        const position = new Position(0, 12);

        const result = findCurrentArgument(doc, position);

        assert.ok(result !== undefined);
        // Should select 'c'
        assert.deepStrictEqual(result.start, new Position(0, 11));
        assert.deepStrictEqual(result.end, new Position(0, 12));
    });

    test('should handle arguments with spaces', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'func(a,  b  , c)' });
        // Position (0, 10): in the space before 'b'
        const position = new Position(0, 10);

        const result = findCurrentArgument(doc, position);

        assert.ok(result !== undefined);
        // Should select 'b' (spaces excluded)
        assert.deepStrictEqual(result.start, new Position(0, 9));
        assert.deepStrictEqual(result.end, new Position(0, 10));
    });

    test('should ignore commas inside double-quoted strings', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'func("hello, world", b)' });
        // Position (0, 10): inside the string "hello, world"
        const position = new Position(0, 10);

        const result = findCurrentArgument(doc, position);

        assert.ok(result !== undefined);
        // Should select the entire string "hello, world"
        assert.deepStrictEqual(result.start, new Position(0, 5));
        assert.deepStrictEqual(result.end, new Position(0, 19));
    });

    test('should ignore commas inside single-quoted strings', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: "func('hello, world', b)" });
        // Position (0, 10): inside the string 'hello, world'
        const position = new Position(0, 10);

        const result = findCurrentArgument(doc, position);

        assert.ok(result !== undefined);
        // Should select the entire string 'hello, world'
        assert.deepStrictEqual(result.start, new Position(0, 5));
        assert.deepStrictEqual(result.end, new Position(0, 19));
    });

    test('should ignore commas inside character literals', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: "func(',', b)" });
        // Position (0, 6): between ',' and '\'
        const position = new Position(0, 6);

        const result = findCurrentArgument(doc, position);

        assert.ok(result !== undefined);
        // Should select the character literal ','
        assert.deepStrictEqual(result.start, new Position(0, 5));
        assert.deepStrictEqual(result.end, new Position(0, 8));
    });

    test('should handle nested parentheses', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'func(a, bar(x, y), c)' });
        // Position (0, 13): between 'x' and ','
        const position = new Position(0, 13);

        const result = findCurrentArgument(doc, position);

        assert.ok(result !== undefined);
        // Should select 'x'
        assert.deepStrictEqual(result.start, new Position(0, 12));
        assert.deepStrictEqual(result.end, new Position(0, 13));
    });

    test('should handle nested parentheses second argument', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'func(a, bar(x, y), c)' });
        // Position (0, 16): between 'y' and ')'
        const position = new Position(0, 16);

        const result = findCurrentArgument(doc, position);

        assert.ok(result !== undefined);
        // Should select 'y' within the nested function
        assert.deepStrictEqual(result.start, new Position(0, 15));
        assert.deepStrictEqual(result.end, new Position(0, 16));
    });

    test('should return undefined if cursor is outside parentheses', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'func(a, b)' });
        // Position (0, 0): before 'f' (outside parentheses)
        const position = new Position(0, 0);

        const result = findCurrentArgument(doc, position);

        assert.strictEqual(result, undefined);
    });

    test('should return undefined if no parentheses found', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'hello world' });
        // Position (0, 5): between 'o' and space
        const position = new Position(0, 5);

        const result = findCurrentArgument(doc, position);

        assert.strictEqual(result, undefined);
    });

    // aa (around argument) tests with includeComma option
    test('should include comma after first argument', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'func(a, b, c)' });
        // Position (0, 6): between 'a' and ','
        const position = new Position(0, 6);

        const result = findCurrentArgument(doc, position, { includeComma: true });

        assert.ok(result !== undefined);
        // Should select 'a,' (including the comma but not the space)
        assert.deepStrictEqual(result.start, new Position(0, 5));
        assert.deepStrictEqual(result.end, new Position(0, 7));
    });

    test('should include comma before middle argument', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'func(a, b, c)' });
        // Position (0, 9): between 'b' and ','
        const position = new Position(0, 9);

        const result = findCurrentArgument(doc, position, { includeComma: true });

        assert.ok(result !== undefined);
        // Should select ', b' (including comma before)
        assert.deepStrictEqual(result.start, new Position(0, 6));
        assert.deepStrictEqual(result.end, new Position(0, 9));
    });

    test('should include comma before last argument', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'func(a, b, c)' });
        // Position (0, 12): between 'c' and ')'
        const position = new Position(0, 12);

        const result = findCurrentArgument(doc, position, { includeComma: true });

        assert.ok(result !== undefined);
        // Should select ', c' (including comma before)
        assert.deepStrictEqual(result.start, new Position(0, 9));
        assert.deepStrictEqual(result.end, new Position(0, 12));
    });

    test('should handle single argument with includeComma', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: 'func(a)' });
        // Position (0, 6): between 'a' and ')'
        const position = new Position(0, 6);

        const result = findCurrentArgument(doc, position, { includeComma: true });

        assert.ok(result !== undefined);
        // Should select just 'a' (no comma to include)
        assert.deepStrictEqual(result.start, new Position(0, 5));
        assert.deepStrictEqual(result.end, new Position(0, 6));
    });
});
