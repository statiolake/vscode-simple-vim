# Waltz

**Graceful modal editing for VS Code.**

Waltz is a modal editing extension for VS Code that emphasizes smooth integration with VS Code's native features. It provides Vim-inspired keybindings while fully embracing VS Code's philosophy—from multiple cursors to native selection handling.

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

## Modes

Waltz operates in four distinct modes:

| Mode | Entry | Exit |
|-|-|-|
| **Normal** | Default, press `Escape` | Enter Insert/Visual/Visual Line mode |
| **Insert** | `i`, `a`, `I`, `A`, `o`, `O` | `Escape` |
| **Visual** | `v` from Normal mode | `Escape` or mode-switching actions |
| **Visual Line** | `V` from Normal mode | `Escape` or mode-switching actions |

## Operators

Operators act on text defined by motions or text objects. Used in Normal mode by typing an operator followed by a motion/text object.

| Keys | Description | Modes |
|-|-|-|
| `d` | Delete (cuts to register) | Normal |
| `y` | Yank (copies to register) | Normal |
| `c` | Change (delete and insert) | Normal |

### Operator Shorthands

| Keys | Description |
|-|-|
| `x` | Delete character at cursor |
| `dd` | Delete entire line |
| `yy` | Yank entire line |
| `D` | Delete to end of line |
| `Y` | Yank to end of line |
| `C` | Delete to end of line and enter Insert mode |

## Motions

Motions move the cursor in Normal or Visual mode. In Visual mode, one side of the selection stays anchored while the other side moves.

### Basic Character Motions

| Keys | Description |
|-|-|
| `h` | Move left |
| `l` | Move right |
| `k` | Move up |
| `j` | Move down |

### Word Motions

| Keys | Description |
|-|-|
| `w` | Move to next word boundary (stops at punctuation) |
| `W` | Move to next WORD boundary (stops at whitespace only) |
| `b` | Move to previous word boundary |
| `B` | Move to previous WORD boundary |
| `e` | Move to end of current/next word |
| `E` | Move to end of current/next WORD |
| `ge` | Move to end of previous word |
| `gE` | Move to end of previous WORD |

### Line Navigation

| Keys | Description |
|-|-|
| `0` | Move to start of line |
| `$` | Move to end of line |
| `^` | Move to first non-whitespace character |

### Search Motions

| Keys | Description |
|-|-|
| `f<char>` | Find character forward on current line (move to character) |
| `F<char>` | Find character backward on current line |
| `t<char>` | Find character forward on current line (move before character) |
| `T<char>` | Find character backward on current line |
| `;` | Repeat last search forward |
| `,` | Repeat last search backward |

### Document Navigation

| Keys | Description |
|-|-|
| `gg` | Move to first line of document |
| `G` | Move to last line of document |
| `{` | Move to previous paragraph boundary |
| `}` | Move to next paragraph boundary |
| `%` | Move to matching bracket/paren (works with `()`, `[]`, `{}`) |

### Page Navigation

| Keys | Description |
|-|-|
| `Ctrl+d` | Scroll down half page |
| `Ctrl+u` | Scroll up half page |

## Text Objects

Text objects select ranges of text for use with operators. They must follow an operator in Normal mode.

### Word Text Objects

| Keys | Description |
|-|-|
| `iw` | Inner word (word characters only) |
| `aw` | A word (word + surrounding whitespace) |
| `iW` | Inner WORD (non-whitespace only) |
| `aW` | A WORD (WORD + surrounding whitespace) |

### Bracket/Parenthesis Text Objects

| Keys | Description |
|-|-|
| `i(` / `ib` | Inside parentheses |
| `a(` / `ab` | Around parentheses |
| `i{` / `iB` | Inside braces |
| `a{` / `aB` | Around braces |
| `i[` / `i]` | Inside square brackets |
| `a[` / `a]` | Around square brackets |
| `i<` / `i>` | Inside angle brackets |
| `a<` / `a>` | Around angle brackets |

### Quote Text Objects

| Keys | Description |
|-|-|
| `i"` | Inside double quotes |
| `a"` | Around double quotes |
| `i'` | Inside single quotes |
| `a'` | Around single quotes |
| `` i` `` | Inside backticks |
| `` a` `` | Around backticks |

### Tag Text Objects

| Keys | Description |
|-|-|
| `it` | Inside tags (HTML/XML content without tags) |
| `at` | Around tags (HTML/XML content with tags) |

### Paragraph Text Objects

| Keys | Description |
|-|-|
| `ip` | Inside paragraph |
| `ap` | Around paragraph |

### Indentation Text Objects

| Keys | Description |
|-|-|
| `ii` | Inside indentation level |

### Motions as Text Objects

All motions can be used as text objects with operators. For example:
- `dw` - Delete to next word
- `d$` - Delete to end of line
- `dj` - Delete current and next line

## Surround Actions

Vim-like surround operations for adding, deleting, and changing surrounding characters.

### Add Surround

| Keys | Description | Example |
|-|-|-|
| `ys<motion><char>` | Add surrounding character | `ysiw"` surrounds word with quotes |

Supported surround characters: `()`, `{}`, `[]`, `<>`, `"`, `'`, `` ` ``, and bracket aliases `b` for `()`, `B` for `{}`

### Delete Surround

| Keys | Description | Example |
|-|-|-|
| `ds<char>` | Delete surrounding character | `ds"` removes surrounding quotes |

### Change Surround

| Keys | Description | Example |
|-|-|-|
| `cs<old><new>` | Change surrounding character | `cs"'` changes quotes |

### Surround in Visual Mode

| Keys | Description |
|-|-|
| `S<char>` | Surround selection with character |

## Actions

Miscellaneous editing commands.

### Insert Mode Entry

| Keys | Description | Modes |
|-|-|-|
| `i` | Enter Insert mode | Normal |
| `a` | Move one char right and enter Insert mode | Normal |
| `I` | Move to first non-whitespace and enter Insert mode | Normal |
| `A` | Move to end of line and enter Insert mode | Normal |
| `o` | Insert line below and enter Insert mode | Normal |
| `O` | Insert line above and enter Insert mode | Normal |

### Register Operations

| Keys | Description | Modes |
|-|-|-|
| `p` | Paste register after cursor | Normal, Visual, Visual Line |
| `P` | Paste register before cursor | Normal, Visual, Visual Line |

### Text Manipulation

| Keys | Description | Modes |
|-|-|-|
| `J` | Join current and next line | Normal, Visual, Visual Line |
| `r<char>` | Replace character at cursor | Normal, Visual, Visual Line |

### Undo/Redo

| Keys | Description | Modes |
|-|-|-|
| `u` | Undo | Normal, Visual, Visual Line |
| `Ctrl+r` | Redo | Normal (outside Insert mode) |

### Screen Positioning

| Keys | Description | Modes |
|-|-|-|
| `zz` | Center cursor line on screen | Normal, Visual, Visual Line |
| `zt` | Move cursor line to top of screen | Normal, Visual, Visual Line |
| `zb` | Move cursor line to bottom of screen | Normal, Visual, Visual Line |

## LSP (Language Server Protocol) Actions

Integrate with VS Code's language intelligence features. All available in Normal mode unless noted.

### Navigation

| Keys | Description |
|-|-|
| `gh` | Show hover information (type hints, documentation) |
| `gd` | Go to definition |
| `gD` | Go to declaration |
| `gy` | Go to type definition |
| `gI` | Go to implementation |
| `gr` | Go to references |

### Editing

| Keys | Description | Modes |
|-|-|-|
| `gR` | Rename symbol | Normal |
| `g.` | Open code actions / quick fix menu | Normal, Visual, Visual Line |
| `gf` | Format document | Normal, Visual, Visual Line |

### Diagnostics

| Keys | Description |
|-|-|
| `gp` | Open problems panel |
| `[d` | Go to previous problem/diagnostic |
| `]d` | Go to next problem/diagnostic |

## Differences From Vim

Waltz prioritizes smooth integration with VS Code over strict Vim compatibility. Here are key differences:

- **No macros**: Use VS Code's multiple cursors instead. Place cursors with `Cmd+d`, `Cmd+Alt+Down`, or `Alt+Click` to edit all locations simultaneously.

- **No `.` (repeat) command**: Use multiple cursors or repeat the command instead.

- **No count prefix**: In Vim you can use counts like `3w`. In Waltz, just repeat the command or use a command that accomplishes your goal in one action.

- **Cursor can exceed line length**: In Normal mode, the cursor can go one position past the last character due to VS Code's selection model.

- **No registers**: The `d` operator copies to clipboard when deleting, so deleted text is available for pasting.

- **Different `f` and `t` motions**:
  - `t` takes one character
  - `f` takes two characters (like vim-sneak plugin)
  - `t` works like Vim's `t` in Normal mode but like `f` in Visual mode

- **No `/` (search) command**: Use the `f` motion or VS Code's native find (`Cmd+f`).

- **No jump list**: Use VS Code's native navigation with `Ctrl+-` and `Ctrl+_` instead of `Ctrl+o` and `Ctrl+i`.

- **No marks**: Use VS Code's split view with `Cmd+1` and `Cmd+2` to navigate between locations, or `Ctrl+-` to jump back.

## Settings

### Yank Highlight Color

The `y` (yank) operator temporarily highlights the yanked text to make it obvious what you're copying. Customize the highlight color:

```json
{
    "waltz.yankHighlightBackgroundColor": "#F8F3AB"
}
```

### Custom Key Bindings

Extend Waltz with custom key bindings via the `waltz.customBindings` setting:

```json
{
    "waltz.customBindings": [
        {
            "keys": ["space", "f"],
            "modes": ["normal"],
            "commands": [
                {
                    "command": "workbench.action.quickOpen"
                }
            ]
        },
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

#### Custom Binding Options

- `keys` (required): Array of strings for the key sequence (e.g., `["g", "d"]`)
- `commands` (required): Array of VS Code commands to execute sequentially, each with:
  - `command` (required): The VS Code command ID
  - `args` (optional): Arguments to pass to the command
- `modes` (optional): Array of modes where binding is active (`"normal"`, `"visual"`, `"visualLine"`, `"insert"`). If omitted, applies to all modes.

Custom bindings are checked before default bindings, allowing you to override built-in mappings.

### Customizable Keybindings

Many of Waltz's actions use symbolic keybindings that can be remapped via your VS Code `keybindings.json`. This allows you to customize frequently-used actions without modifying the extension itself.

#### Page Navigation

Default mappings for half-page movement can be customized:

```json
{
    "key": "ctrl+d",
    "command": "waltz.send",
    "args": {
        "keys": "<Waltz>half-page-down"
    },
    "when": "editorTextFocus && waltz.mode != 'insert'"
},
{
    "key": "ctrl+u",
    "command": "waltz.send",
    "args": {
        "keys": "<Waltz>half-page-up"
    },
    "when": "editorTextFocus && waltz.mode != 'insert'"
}
```

You can remap these to different keys by modifying the `"key"` field. The action names (`<Waltz>half-page-down`, `<Waltz>half-page-up`) remain the same.

#### Clipboard Operations

Copy, cut, and paste operations can be customized:

```json
{
    "mac": "cmd+c",
    "win": "ctrl+c",
    "linux": "ctrl+c",
    "command": "waltz.send",
    "args": {
        "keys": "<Waltz>copy"
    },
    "when": "editorTextFocus && waltz.mode != 'insert'"
},
{
    "mac": "cmd+x",
    "win": "ctrl+x",
    "linux": "ctrl+x",
    "command": "waltz.send",
    "args": {
        "keys": "<Waltz>cut"
    },
    "when": "editorTextFocus && waltz.mode != 'insert'"
},
{
    "mac": "cmd+v",
    "win": "ctrl+v",
    "linux": "ctrl+v",
    "command": "waltz.send",
    "args": {
        "keys": "<Waltz>paste"
    },
    "when": "editorTextFocus && waltz.mode != 'insert'"
}
```

The available actions are:
- `<Waltz>copy` - Copy (yank) selection or line
- `<Waltz>cut` - Cut (delete) selection or line
- `<Waltz>paste` - Paste from clipboard

## Tips & Tricks

### Navigate with Multiple Cursors

Place cursors on multiple lines and use motions to select together:
1. Position cursor with `Cmd+d` or `Cmd+Alt+Down`
2. Use motions like `w`, `$`, etc. to navigate all cursors
3. Execute operators like `d`, `y`, `c` to edit all positions

### Combine Text Objects and Operators

- `diw` - Delete inner word
- `ci"` - Change inside double quotes
- `ya{` - Yank around braces
- `ds(` - Delete surrounding parentheses

### Using Search Motions

- `f,` then `;` - Find commas and repeat forward
- `t(` then `,` - Find before ( and repeat backward
- Great for navigating through code with known character patterns

## License

MIT License - See [LICENSE.txt](LICENSE.txt) for details.
