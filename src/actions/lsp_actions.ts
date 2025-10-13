import * as vscode from 'vscode';
import type { Action } from '../action_types';
import { Mode } from '../modes_types';
import { parseKeysExact } from '../parse_keys';

export const lspActions: Action[] = [
    // gh: Show hover information
    parseKeysExact(['g', 'h'], [Mode.Normal], async (_vimState, _editor) => {
        await vscode.commands.executeCommand('editor.action.showHover');
    }),

    // go: Go to definition
    parseKeysExact(['g', 'o'], [Mode.Normal], async (_vimState, _editor) => {
        await vscode.commands.executeCommand('editor.action.revealDefinition');
    }),

    // gD: Go to declaration
    parseKeysExact(['g', 'D'], [Mode.Normal], async (_vimState, _editor) => {
        await vscode.commands.executeCommand('editor.action.revealDeclaration');
    }),

    // gy: Go to type definition
    parseKeysExact(['g', 'y'], [Mode.Normal], async (_vimState, _editor) => {
        await vscode.commands.executeCommand('editor.action.goToTypeDefinition');
    }),

    // gI: Go to implementation
    parseKeysExact(['g', 'I'], [Mode.Normal], async (_vimState, _editor) => {
        await vscode.commands.executeCommand('editor.action.goToImplementation');
    }),

    // gr: Go to references
    parseKeysExact(['g', 'r'], [Mode.Normal], async (_vimState, _editor) => {
        await vscode.commands.executeCommand('editor.action.goToReferences');
    }),

    // gR: Rename symbol
    parseKeysExact(['g', 'R'], [Mode.Normal], async (_vimState, _editor) => {
        await vscode.commands.executeCommand('editor.action.rename');
    }),

    // g.: Quick fix / code action
    parseKeysExact(['g', '.'], [Mode.Normal], async (_vimState, _editor) => {
        await vscode.commands.executeCommand('editor.action.quickFix');
    }),

    // gp: Open problems panel
    parseKeysExact(['g', 'p'], [Mode.Normal], async (_vimState, _editor) => {
        await vscode.commands.executeCommand('workbench.actions.view.problems');
    }),

    // [d: Previous diagnostic
    parseKeysExact(['[', 'd'], [Mode.Normal], async (_vimState, _editor) => {
        await vscode.commands.executeCommand('editor.action.marker.prevInFiles');
    }),

    // ]d: Next diagnostic
    parseKeysExact([']', 'd'], [Mode.Normal], async (_vimState, _editor) => {
        await vscode.commands.executeCommand('editor.action.marker.nextInFiles');
    }),

    // gf: Format document
    parseKeysExact(['g', 'f'], [Mode.Normal], async (_vimState, _editor) => {
        await vscode.commands.executeCommand('editor.action.formatDocument');
    }),
];
