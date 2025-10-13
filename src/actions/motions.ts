import * as vscode from 'vscode';
import type { Action } from '../action_types';
import { isVscodeNativeCursor } from '../config';
import { Mode } from '../modes_types';
import { paragraphBackward, paragraphForward } from '../paragraph_utils';
import { parseKeysExact, parseKeysRegex } from '../parse_keys';
import * as positionUtils from '../position_utils';
import {
    vimToVscodeVisualLineSelection,
    vimToVscodeVisualSelection,
    vscodeToVimVisualLineSelection,
    vscodeToVimVisualSelection,
} from '../selection_utils';
import type { VimState } from '../vim_state_types';
import { setVisualLineSelections } from '../visual_line_utils';
import { setVisualSelections } from '../visual_utils';
import { whitespaceWordRanges, wordRanges } from '../word_utils';

export const motions: Action[] = [
    parseKeysExact(['l'], [Mode.Normal, Mode.Visual], (vimState, editor) => {
        execMotion(vimState, editor, ({ document, position }) => {
            return positionUtils.rightNormal(document, position);
        });
    }),

    parseKeysExact(['h'], [Mode.Normal, Mode.Visual], (vimState, editor) => {
        execMotion(vimState, editor, ({ position }) => {
            return positionUtils.left(position);
        });
    }),

    parseKeysExact(['k'], [Mode.Normal], (_vimState, _editor) => {
        vscode.commands.executeCommand('cursorMove', { to: 'up', by: 'line' });
    }),
    parseKeysExact(['k'], [Mode.Visual], (_vimState, editor) => {
        const originalSelections = editor.selections;

        vscode.commands.executeCommand('cursorMove', { to: 'up', by: 'line', select: true }).then(() => {
            setVisualSelections(editor, originalSelections);
        });
    }),
    parseKeysExact(['g', 'k'], [Mode.Normal], (_vimState, _editor) => {
        vscode.commands.executeCommand('cursorMove', { to: 'up', by: 'wrappedLine' });
    }),
    parseKeysExact(['g', 'k'], [Mode.Visual], (_vimState, editor) => {
        const originalSelections = editor.selections;

        vscode.commands.executeCommand('cursorMove', { to: 'up', by: 'wrappedLine', select: true }).then(() => {
            setVisualSelections(editor, originalSelections);
        });
    }),
    parseKeysExact(['k'], [Mode.VisualLine], (_vimState, editor) => {
        vscode.commands.executeCommand('cursorMove', { to: 'up', by: 'line', select: true }).then(() => {
            setVisualLineSelections(editor);
        });
    }),

    parseKeysExact(['j'], [Mode.Normal], (_vimState, _editor) => {
        vscode.commands.executeCommand('cursorMove', { to: 'down', by: 'line' });
    }),
    parseKeysExact(['j'], [Mode.Visual], (_vimState, editor) => {
        const originalSelections = editor.selections;

        vscode.commands.executeCommand('cursorMove', { to: 'down', by: 'line', select: true }).then(() => {
            setVisualSelections(editor, originalSelections);
        });
    }),
    parseKeysExact(['g', 'j'], [Mode.Normal], (_vimState, _editor) => {
        vscode.commands.executeCommand('cursorMove', { to: 'down', by: 'wrappedLine' });
    }),
    parseKeysExact(['g', 'j'], [Mode.Visual], (_vimState, editor) => {
        const originalSelections = editor.selections;

        vscode.commands.executeCommand('cursorMove', { to: 'down', by: 'wrappedLine', select: true }).then(() => {
            setVisualSelections(editor, originalSelections);
        });
    }),
    parseKeysExact(['j'], [Mode.VisualLine], (_vimState, editor) => {
        vscode.commands.executeCommand('cursorMove', { to: 'down', by: 'line', select: true }).then(() => {
            setVisualLineSelections(editor);
        });
    }),

    parseKeysExact(['w'], [Mode.Normal, Mode.Visual], createWordForwardHandler(wordRanges)),
    parseKeysExact(['W'], [Mode.Normal, Mode.Visual], createWordForwardHandler(whitespaceWordRanges)),

    parseKeysExact(['b'], [Mode.Normal, Mode.Visual], createWordBackwardHandler(wordRanges)),
    parseKeysExact(['B'], [Mode.Normal, Mode.Visual], createWordBackwardHandler(whitespaceWordRanges)),

    parseKeysExact(['e'], [Mode.Normal, Mode.Visual], createWordEndHandler(wordRanges)),
    parseKeysExact(['E'], [Mode.Normal, Mode.Visual], createWordEndHandler(whitespaceWordRanges)),

    parseKeysExact(['g', 'e'], [Mode.Normal, Mode.Visual], createWordEndBackwardHandler(wordRanges)),
    parseKeysExact(['g', 'E'], [Mode.Normal, Mode.Visual], createWordEndBackwardHandler(whitespaceWordRanges)),

    parseKeysRegex(/^f(.)$/, /^f$/, [Mode.Normal, Mode.Visual], (vimState, editor, match) => {
        findForward(vimState, editor, match);

        vimState.semicolonAction = (innerVimState, innerEditor) => {
            findForward(innerVimState, innerEditor, match);
        };

        vimState.commaAction = (innerVimState, innerEditor) => {
            findBackward(innerVimState, innerEditor, match);
        };
    }),

    parseKeysRegex(/^F(.)$/, /^F$/, [Mode.Normal, Mode.Visual], (vimState, editor, match) => {
        findBackward(vimState, editor, match);

        vimState.semicolonAction = (innerVimState, innerEditor) => {
            findBackward(innerVimState, innerEditor, match);
        };

        vimState.commaAction = (innerVimState, innerEditor) => {
            findForward(innerVimState, innerEditor, match);
        };
    }),

    parseKeysRegex(/^t(.)$/, /^t$/, [Mode.Normal, Mode.Visual], (vimState, editor, match) => {
        tillForward(vimState, editor, match);

        vimState.semicolonAction = (innerVimState, innerEditor) => {
            tillForward(innerVimState, innerEditor, match);
        };

        vimState.commaAction = (innerVimState, innerEditor) => {
            tillBackward(innerVimState, innerEditor, match);
        };
    }),

    parseKeysRegex(/^T(.)$/, /^T$/, [Mode.Normal, Mode.Visual], (vimState, editor, match) => {
        tillBackward(vimState, editor, match);

        vimState.semicolonAction = (innerVimState, innerEditor) => {
            tillBackward(innerVimState, innerEditor, match);
        };

        vimState.commaAction = (innerVimState, innerEditor) => {
            tillForward(innerVimState, innerEditor, match);
        };
    }),

    parseKeysExact(['g', 'g'], [Mode.Normal, Mode.Visual, Mode.VisualLine], (vimState, editor) => {
        execMotion(vimState, editor, () => {
            return new vscode.Position(0, 0);
        });
    }),

    parseKeysExact(['G'], [Mode.Normal, Mode.Visual, Mode.VisualLine], (vimState, editor) => {
        execMotion(vimState, editor, ({ document }) => {
            return new vscode.Position(document.lineCount - 1, 0);
        });
    }),

    parseKeysExact(['}'], [Mode.Normal, Mode.Visual, Mode.VisualLine], (vimState, editor) => {
        execMotion(vimState, editor, ({ document, position }) => {
            return new vscode.Position(paragraphForward(document, position.line), 0);
        });
    }),

    parseKeysExact(['{'], [Mode.Normal, Mode.Visual, Mode.VisualLine], (vimState, editor) => {
        execMotion(vimState, editor, ({ document, position }) => {
            return new vscode.Position(paragraphBackward(document, position.line), 0);
        });
    }),

    parseKeysExact(['$'], [Mode.Normal, Mode.Visual, Mode.VisualLine], (vimState, editor) => {
        execMotion(vimState, editor, ({ document, position }) => {
            const lineLength = document.lineAt(position.line).text.length;
            // In vscode-native mode, move to end-of-line (after last character)
            // In vim-traditional mode, move to last character
            if (isVscodeNativeCursor()) {
                return position.with({ character: lineLength });
            } else {
                return position.with({ character: Math.max(lineLength - 1, 0) });
            }
        });
    }),

    parseKeysExact(['0'], [Mode.Normal, Mode.Visual, Mode.VisualLine], (vimState, editor) => {
        execMotion(vimState, editor, ({ position }) => {
            return position.with({ character: 0 });
        });
    }),

    parseKeysExact(['^'], [Mode.Normal, Mode.Visual, Mode.VisualLine], (vimState, editor) => {
        execMotion(vimState, editor, ({ document, position }) => {
            const line = document.lineAt(position.line);
            return position.with({ character: line.firstNonWhitespaceCharacterIndex });
        });
    }),

    parseKeysExact(['_'], [Mode.Normal, Mode.Visual, Mode.VisualLine], (vimState, editor) => {
        execMotion(vimState, editor, ({ document, position }) => {
            const line = document.lineAt(position.line);
            return position.with({ character: line.firstNonWhitespaceCharacterIndex });
        });
    }),

    parseKeysExact(['H'], [Mode.Normal], (_vimState, _editor) => {
        vscode.commands.executeCommand('cursorMove', { to: 'viewPortTop', by: 'line' });
    }),
    parseKeysExact(['H'], [Mode.Visual], (_vimState, editor) => {
        const originalSelections = editor.selections;

        vscode.commands.executeCommand('cursorMove', { to: 'viewPortTop', by: 'line', select: true }).then(() => {
            setVisualSelections(editor, originalSelections);
        });
    }),
    parseKeysExact(['H'], [Mode.VisualLine], (_vimState, editor) => {
        vscode.commands.executeCommand('cursorMove', { to: 'viewPortTop', by: 'line', select: true }).then(() => {
            setVisualLineSelections(editor);
        });
    }),

    parseKeysExact(['M'], [Mode.Normal], (_vimState, _editor) => {
        vscode.commands.executeCommand('cursorMove', { to: 'viewPortCenter', by: 'line' });
    }),
    parseKeysExact(['M'], [Mode.Visual], (_vimState, editor) => {
        const originalSelections = editor.selections;

        vscode.commands.executeCommand('cursorMove', { to: 'viewPortCenter', by: 'line', select: true }).then(() => {
            setVisualSelections(editor, originalSelections);
        });
    }),
    parseKeysExact(['M'], [Mode.VisualLine], (_vimState, editor) => {
        vscode.commands.executeCommand('cursorMove', { to: 'viewPortCenter', by: 'line', select: true }).then(() => {
            setVisualLineSelections(editor);
        });
    }),

    parseKeysExact(['L'], [Mode.Normal], (_vimState, _editor) => {
        vscode.commands.executeCommand('cursorMove', { to: 'viewPortBottom', by: 'line' });
    }),
    parseKeysExact(['L'], [Mode.Visual], (_vimState, editor) => {
        const originalSelections = editor.selections;

        vscode.commands.executeCommand('cursorMove', { to: 'viewPortBottom', by: 'line', select: true }).then(() => {
            setVisualSelections(editor, originalSelections);
        });
    }),
    parseKeysExact(['L'], [Mode.VisualLine], (_vimState, editor) => {
        vscode.commands.executeCommand('cursorMove', { to: 'viewPortBottom', by: 'line', select: true }).then(() => {
            setVisualLineSelections(editor);
        });
    }),
];

type MotionArgs = {
    document: vscode.TextDocument;
    position: vscode.Position;
    selectionIndex: number;
    vimState: VimState;
};

type RegexMotionArgs = {
    document: vscode.TextDocument;
    position: vscode.Position;
    selectionIndex: number;
    vimState: VimState;
    match: RegExpMatchArray;
};

function execRegexMotion(
    vimState: VimState,
    editor: vscode.TextEditor,
    match: RegExpMatchArray,
    regexMotion: (args: RegexMotionArgs) => vscode.Position,
) {
    return execMotion(vimState, editor, (motionArgs) => {
        return regexMotion({
            ...motionArgs,
            match: match,
        });
    });
}

function execMotion(vimState: VimState, editor: vscode.TextEditor, motion: (args: MotionArgs) => vscode.Position) {
    const document = editor.document;

    const newSelections = editor.selections.map((selection, i) => {
        if (vimState.mode === Mode.Normal) {
            const newPosition = motion({
                document: document,
                position: selection.active,
                selectionIndex: i,
                vimState: vimState,
            });
            return new vscode.Selection(newPosition, newPosition);
        } else if (vimState.mode === Mode.Visual) {
            const vimSelection = vscodeToVimVisualSelection(document, selection);
            const motionPosition = motion({
                document: document,
                position: vimSelection.active,
                selectionIndex: i,
                vimState: vimState,
            });

            return vimToVscodeVisualSelection(document, new vscode.Selection(vimSelection.anchor, motionPosition));
        } else if (vimState.mode === Mode.VisualLine) {
            const vimSelection = vscodeToVimVisualLineSelection(document, selection);
            const motionPosition = motion({
                document: document,
                position: vimSelection.active,
                selectionIndex: i,
                vimState: vimState,
            });

            return vimToVscodeVisualLineSelection(document, new vscode.Selection(vimSelection.anchor, motionPosition));
        } else {
            return selection;
        }
    });

    editor.selections = newSelections;

    editor.revealRange(
        new vscode.Range(newSelections[0].active, newSelections[0].active),
        vscode.TextEditorRevealType.InCenterIfOutsideViewport,
    );
}

function findForward(vimState: VimState, editor: vscode.TextEditor, outerMatch: RegExpMatchArray): void {
    execRegexMotion(vimState, editor, outerMatch, ({ document, position, match }) => {
        const lineText = document.lineAt(position.line).text;
        const result = lineText.indexOf(match[1], position.character + 1);

        if (result >= 0) {
            // In vscode-native mode, move after the character
            // In vim-traditional mode, move to the character position
            if (isVscodeNativeCursor()) {
                const lineLength = document.lineAt(position.line).text.length;
                return position.with({ character: Math.min(result + 1, lineLength) });
            } else {
                return position.with({ character: result });
            }
        } else {
            return position;
        }
    });
}

function findBackward(vimState: VimState, editor: vscode.TextEditor, outerMatch: RegExpMatchArray): void {
    execRegexMotion(vimState, editor, outerMatch, ({ document, position, match }) => {
        const lineText = document.lineAt(position.line).text;
        const result = lineText.lastIndexOf(match[1], position.character - 1);

        if (result >= 0) {
            return position.with({ character: result });
        } else {
            return position;
        }
    });
}

function tillForward(vimState: VimState, editor: vscode.TextEditor, outerMatch: RegExpMatchArray): void {
    execRegexMotion(vimState, editor, outerMatch, ({ document, position, match }) => {
        const lineText = document.lineAt(position.line).text;
        const result = lineText.indexOf(match[1], position.character + 1);

        if (result >= 0) {
            // In vscode-native mode, move before the character (one position back)
            // In vim-traditional mode, move to the character position
            if (isVscodeNativeCursor()) {
                return position.with({ character: result });
            } else {
                return position.with({ character: Math.max(result - 1, 0) });
            }
        } else {
            return position;
        }
    });
}

function tillBackward(vimState: VimState, editor: vscode.TextEditor, outerMatch: RegExpMatchArray): void {
    execRegexMotion(vimState, editor, outerMatch, ({ document, position, match }) => {
        const lineText = document.lineAt(position.line).text;
        const result = lineText.lastIndexOf(match[1], position.character - 1);

        if (result >= 0) {
            // In vscode-native mode, move after the character (one position forward)
            // In vim-traditional mode, move to the character position
            if (isVscodeNativeCursor()) {
                const lineLength = document.lineAt(position.line).text.length;
                return position.with({ character: Math.min(result + 1, lineLength) });
            } else {
                return position.with({ character: result });
            }
        } else {
            return position;
        }
    });
}

function createWordForwardHandler(
    wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: VimState, editor: vscode.TextEditor) => void {
    return (vimState, editor) => {
        execMotion(vimState, editor, ({ document, position }) => {
            const lineText = document.lineAt(position.line).text;
            const ranges = wordRangesFunction(lineText);

            const result = ranges.find((x) => x.start > position.character);

            if (result) {
                return position.with({ character: result.start });
            } else {
                // Try to wrap to next line (move to beginning of next line)
                if (position.line < document.lineCount - 1) {
                    const nextLine = position.line + 1;
                    const nextLineText = document.lineAt(nextLine).text;
                    const nextRanges = wordRangesFunction(nextLineText);

                    if (nextRanges.length > 0) {
                        return new vscode.Position(nextLine, nextRanges[0].start);
                    } else {
                        // Empty line - move to beginning of line
                        return new vscode.Position(nextLine, 0);
                    }
                }
                return position;
            }
        });
    };
}

function createWordBackwardHandler(
    wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: VimState, editor: vscode.TextEditor) => void {
    return (vimState, editor) => {
        execMotion(vimState, editor, ({ document, position }) => {
            const lineText = document.lineAt(position.line).text;
            const ranges = wordRangesFunction(lineText);

            const result = ranges.reverse().find((x) => x.start < position.character);

            if (result) {
                return position.with({ character: result.start });
            } else {
                // Try to wrap to previous line
                if (position.line > 0) {
                    const prevLine = position.line - 1;
                    const prevLineText = document.lineAt(prevLine).text;
                    const prevRanges = wordRangesFunction(prevLineText);

                    if (prevRanges.length > 0) {
                        const lastRange = prevRanges[prevRanges.length - 1];
                        return new vscode.Position(prevLine, lastRange.start);
                    } else {
                        // Empty line - move to beginning of line
                        return new vscode.Position(prevLine, 0);
                    }
                }
                return position;
            }
        });
    };
}

function createWordEndHandler(
    wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: VimState, editor: vscode.TextEditor) => void {
    return (vimState, editor) => {
        execMotion(vimState, editor, ({ document, position }) => {
            const lineText = document.lineAt(position.line).text;
            const ranges = wordRangesFunction(lineText);

            const result = ranges.find((x) => x.end > position.character);

            if (result) {
                // In vscode-native mode, move to after the last character (result.end + 1)
                // In vim-traditional mode, move to the last character (result.end)
                if (isVscodeNativeCursor()) {
                    return position.with({ character: Math.min(result.end + 1, lineText.length) });
                } else {
                    return position.with({ character: result.end });
                }
            } else {
                // Try to wrap to next line
                if (position.line < document.lineCount - 1) {
                    const nextLine = position.line + 1;
                    const nextLineText = document.lineAt(nextLine).text;
                    const nextRanges = wordRangesFunction(nextLineText);

                    if (nextRanges.length > 0) {
                        const firstRange = nextRanges[0];
                        if (isVscodeNativeCursor()) {
                            return new vscode.Position(nextLine, Math.min(firstRange.end + 1, nextLineText.length));
                        } else {
                            return new vscode.Position(nextLine, firstRange.end);
                        }
                    } else {
                        // Empty line - move to beginning of line
                        return new vscode.Position(nextLine, 0);
                    }
                }
                return position;
            }
        });
    };
}

function createWordEndBackwardHandler(
    wordRangesFunction: (text: string) => { start: number; end: number }[],
): (vimState: VimState, editor: vscode.TextEditor) => void {
    return (vimState, editor) => {
        execMotion(vimState, editor, ({ document, position }) => {
            const lineText = document.lineAt(position.line).text;
            const ranges = wordRangesFunction(lineText);

            // Find the previous word end
            // In vscode-native mode: cursor is after character, so we need x.end + 1 < position.character
            // In vim-traditional mode: cursor is on character, so we need x.end < position.character
            let result: { start: number; end: number } | undefined;
            if (isVscodeNativeCursor()) {
                result = ranges.reverse().find((x) => x.end + 1 < position.character);
            } else {
                result = ranges.reverse().find((x) => x.end < position.character);
            }

            if (result) {
                // In vscode-native mode, move to after the last character (result.end + 1)
                // In vim-traditional mode, move to the last character (result.end)
                if (isVscodeNativeCursor()) {
                    return position.with({ character: Math.min(result.end + 1, lineText.length) });
                } else {
                    return position.with({ character: result.end });
                }
            } else {
                // Try to wrap to previous line
                if (position.line > 0) {
                    const prevLine = position.line - 1;
                    const prevLineText = document.lineAt(prevLine).text;
                    const prevRanges = wordRangesFunction(prevLineText);

                    if (prevRanges.length > 0) {
                        const lastRange = prevRanges[prevRanges.length - 1];
                        if (isVscodeNativeCursor()) {
                            return new vscode.Position(prevLine, Math.min(lastRange.end + 1, prevLineText.length));
                        } else {
                            return new vscode.Position(prevLine, lastRange.end);
                        }
                    } else {
                        // Empty line - move to beginning of line
                        return new vscode.Position(prevLine, 0);
                    }
                }
                return position;
            }
        });
    };
}
