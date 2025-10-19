# Waltz

**Graceful modal editing for VS Code.**

Waltz is a modal editing extension for VS Code that emphasizes smooth integration with VS Code's native features. It provides Vim-inspired keybindings while fully embracing VS Code's philosophy — from multiple cursors to native selection handling.

## Inspiration & Credits

- **Based on**: [jpotterm/vscode-simple-vim](https://github.com/jpotterm/vscode-simple-vim) - The original codebase that made this project possible
- **Philosophically inspired by**: [71/dance](https://github.com/71/dance) - A Kakoune-inspired modal editor that influenced Waltz's design philosophy around selection-first editing and VS Code-native integration

Waltz aims to provide a graceful editing experience that feels natural in VS Code, like a waltz that flows smoothly with the editor's native capabilities.

## Philosophy

Unlike traditional Vim emulation that fights against VS Code's architecture, Waltz embraces it:

- **VS Code-native approach**: Works seamlessly with VS Code's selection model, cursor behavior, and editing primitives
- **Multiple cursors first-class**: Full support for VS Code's multiple cursor features instead of macros
- **Smooth integration**: Designed to complement, not replace, VS Code's built-in features
- **Modal editing without the baggage**: The power of modal editing without strict Vim compatibility constraints

## Operators

Operators act on a range of text. In Normal mode the range is specified by the OperatorRange typed after the operator. In Visual mode it is the visual selection.

| Keys | Description |
|-|-|
| `d` | Yank and delete range. |
| `c` | Delete range and enter insert mode. |
| `y` | Yank range. |
| `s` | Select range and enter Visual mode. |


## OperatorRanges

OperatorRanges select a range for an Operator to act on. They must be used in Normal mode by typing an Operator and then an OperatorRange.

| Keys | Description |
|-|-|
| `l` | Character under cursor. |
| `h` | Character to the left of cursor. |
| `k` | Current line and line above. |
| `j` | Current line and line below. |
| `w` | From cursor to beginning of next word. |
| `W` | From cursor to beginning of next word (including punctuation). |
| `b` | From cursor to beginning of previous word. |
| `B` | From cursor to beginning of previous word (including punctuation). |
| `e` | From cursor to end of next word. |
| `E` | From cursor to end of next word (including punctuation). |
| `iw` | Word under cursor. |
| `iW` | Word (including punctuation) under cursor. |
| `aw` | Word under cursor and whitespace after. |
| `aW` | Word (including punctuation) under cursor and whitespace after. |
| `f<char><char>` | From cursor to next occurrence (case sensitive) of <char><char>. |
| `F<char><char>` | From cursor to previous occurrence (case sensitive) of <char><char>. |
| `t<char>` | From cursor to next occurrence (case sensitive) of <char>. |
| `T<char>` | From cursor to previous occurrence (case sensitive) of <char>. |
| `gg` | From current line to first line of the document. |
| `G` | From current line to last line of the document. |
| `}` | From current line to beginning of next paragraph. |
| `{` | From current line to beginning of previous paragraph. |
| `ip` | Current paragraph. |
| `ap` | Current paragraph and whitespace after. |
| `i<bracket>` | Inside the matching `<bracket>`s. Where `<bracket>` is a quote or opening bracket character (any of ``'"`({[<``).  |
| `a<bracket>` | Outside the matching `<bracket>`s. Where `<bracket>` is a quote or opening bracket character (any of ``'"`({[<``). |
| `it` | Inside XML tag. |
| `at` | Outside XML tag. |
| `ii` | Inside indentation level. |


## Motions

Motions move the cursor and can be used in Normal or Visual mode. In Visual mode they only move one side of the selection; the other side stays anchored to where it was when you entered Visual mode.

| Keys | Description |
|-|-|
| `l` | Character right. |
| `h` | Character left. |
| `k` | Line up. |
| `j` | Line down. |
| `w` | Word right. |
| `W` | Word (including punctuation) right. |
| `b` | Word left. |
| `B` | Word (including punctuation) left. |
| `e` | Word end right. |
| `E` | Word end (including punctuation) right. |
| `f<char><char>` | Next occurrence (case sensitive) of <char><char>. |
| `F<char><char>` | Previous occurrence (case sensitive) of <char><char>. |
| `t<char>` | Next occurrence (case sensitive) of <char>. |
| `T<char>` | Previous occurrence (case sensitive) of <char>. |
| `gg` | First line of the document. |
| `G` | Last line of the document. |
| `}` | Down a paragraph. |
| `{` | Up a paragraph. |
| `$` | End of line. |
| `_` | Beginning of line. |
| `H` | Top of screen. |
| `M` | Middle of screen. |
| `L` | Bottom of screen. |


## Actions

Actions are miscellaneous commands that don't follow the well-defined patterns of Operators, OperatorRanges, or Motions.

| Keys | Description |
|-|-|
| `i` | Enter Insert mode. |
| `I` | Move to beginning of line and enter Insert mode. |
| `a` | Move one character to the right and enter Insert mode. |
| `A` | Move to end of line and enter Insert mode. |
| `v` | Enter VisualCharacter mode. |
| `V` | Enter VisualLine mode. |
| `Escape` | Enter Normal mode. |
| `o` | Insert line below and enter insert mode. |
| `O` | Insert line above and enter insert mode. |
| `p` | Put yanked text after cursor. |
| `P` | Put yanked text before cursor. |
| `gp` | Select the result of the last `p` or `P` actions and enter Visual mode. |
| `u` | Undo. |
| `Ctrl+r` | Redo. |
| `dd` | Delete current line. |
| `D` | Delete to the end of the line. |
| `cc` | Delete current line and enter Insert mode. |
| `C` | Delete to the end of the line and enter Insert mode. |
| `yy` | Yank current line. |
| `Y` | Yank to the end of the line. |
| `rr` | Yank current line and delete it. |
| `R` | Yank to the end of the line and delete it. |
| `ss` | Select current line. |
| `S` | Select to the end of the line. |
| `x` | Delete character. |
| `zt` | Scroll so that cursor is at the top of the screen. |
| `zz` | Scroll so that cursor is in the middle of the screen. |
| `zb` | Scroll so that cursor is at the bottom of the screen. |
| `Ctrl+d` | Scroll down half page. |
| `Ctrl+u` | Scroll up half page. |
| `Ctrl+f` | Scroll down full page. |
| `Ctrl+b` | Scroll up full page. |
| `;` | Repeat the last `f`, `F`, `t` or `T` motion forward. |
| `,` | Repeat the last `f`, `F`, `t` or `T` motion backward. |


## LSP Actions

These actions integrate with VS Code's Language Server Protocol features for code intelligence.

| Keys | Description |
|-|-|
| `gh` | Show hover information (type info, documentation). |
| `gd` | Go to definition. |
| `gD` | Go to declaration. |
| `gy` | Go to type definition. |
| `gI` | Go to implementation. |
| `gr` | Go to references. |
| `gR` | Rename symbol. |
| `g.` | Show code actions / quick fix. |
| `gp` | Open problems panel. |
| `[d` | Go to previous diagnostic/problem. |
| `]d` | Go to next diagnostic/problem. |
| `gf` | Format document. |


## Differences From Vim

Waltz prioritizes smooth integration with VS Code over strict Vim compatibility. If full Vim compatibility is important to you, consider trying a different extension. Here are some of the ways Waltz differs from Vim:

- **No macros**: Waltz has first-class multiple cursor support instead. Place cursors everywhere you would have run the macro (`Cmd+d`, `Cmd+Alt+Down`, `Alt+Click`) and see your changes in real time.

- **No `.` (repeat) command**: Use multiple cursors instead (see previous bullet).

- **No count**: In Vim you can prefix commands with a number. In Waltz, just type the command again or use a command that accomplishes your goal with fewer repetitions.

- **Cursor can go past last character**: In Normal mode, the cursor can go one past the last character of the line. This is due to VS Code's selection model and API limitations.

- **No registers**: The `d` operator has been modified to yank and delete simultaneously, so deleting text also copies it to the clipboard.

- **Different `f` and `t` motions**: `t` takes one character and `f` takes two (like vim-sneak). `t` works like Vim's `t` in Normal mode but Vim's `f` in Visual mode.

- **No `/` (search) command**: Use the `f` motion or native VS Code find instead.

- **No `>` (indent) command**: Use VS Code's `Cmd+]` instead.

- **No `gU` (uppercase) command**: Use VS Code's `Transform to Uppercase` from the Command Palette.

- **No jump list commands**: Use VS Code's native jump list with `Ctrl+-` and `Ctrl+_` instead of `Ctrl+o` and `Ctrl+i`.

- **No marks**: Use VS Code's split window feature with `Cmd+1` and `Cmd+2`, or use `Ctrl+-` to jump back.


## Settings

### Custom Key Bindings

You can add custom key bindings that execute VS Code commands using the `waltz.customBindings` setting. This allows you to extend Waltz with your own key mappings.

```json
{
    "waltz.customBindings": [
        {
            "keys": ["g", "d"],
            "modes": ["normal", "visual"],
            "commands": [
                {
                    "command": "editor.action.revealDefinition"
                }
            ]
        },
        {
            "keys": ["g", "r"],
            "modes": ["normal"],
            "commands": [
                {
                    "command": "editor.action.goToReferences"
                }
            ]
        },
        {
            "keys": ["space", "f"],
            "modes": ["normal"],
            "commands": [
                {
                    "command": "workbench.action.quickOpen"
                }
            ]
        }
    ]
}
```

You can also execute multiple commands sequentially:

```json
{
    "waltz.customBindings": [
        {
            "keys": ["space", "w"],
            "modes": ["normal"],
            "commands": [
                {
                    "command": "workbench.action.files.save"
                },
                {
                    "command": "workbench.action.closeActiveEditor"
                }
            ]
        }
    ]
}
```

Each binding has the following properties:

- `keys` (required): An array of strings representing the key sequence (e.g., `["g", "d"]`)
- `commands` (required): An array of command objects to execute sequentially. Each command object has:
  - `command` (required): The VS Code command to execute (e.g., `"editor.action.revealDefinition"`)
  - `args` (optional): Arguments to pass to the command
- `modes` (optional): An array of modes where this binding is active. Valid values are `"normal"`, `"visual"`, `"visualLine"`, and `"insert"`. If not specified, the binding applies to all modes.

Custom bindings are checked before default bindings, so you can override built-in key mappings if needed.

## License

MIT License - See [LICENSE.txt](LICENSE.txt) for details.
