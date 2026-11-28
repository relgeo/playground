# Playground keyboard commands

The Playground uses `Mod+Alt` for application commands so browser/editor
commands such as `Mod+S` and `Mod+O` remain available to the host. `Mod` means
Control on Windows/Linux and Command on macOS.

| Command | Windows/Linux | macOS | Outcome |
| --- | --- | --- | --- |
| New file | `Ctrl+Alt+N` | `Cmd+Alt+N` | Create a new My File. |
| Open file picker | `Ctrl+Alt+O` | `Cmd+Alt+O` | Focus the My Files/Examples picker. |
| Save | `Ctrl+Alt+S` | `Cmd+Alt+S` | Save the active My File; transient/example source uses Save as. |
| Save as | `Ctrl+Alt+Shift+S` | `Cmd+Alt+Shift+S` | Create a new local copy without overwriting the origin. |
| Import | `Ctrl+Alt+I` | `Cmd+Alt+I` | Open the YAML import picker. |
| Download source | `Ctrl+Alt+E` | `Cmd+Alt+E` | Download the active source as YAML. |
| Fit and recenter | `Ctrl+Alt+F` | `Cmd+Alt+F` | Fit the active preview to its stage. |
| Reset viewport | `Ctrl+Alt+0` | `Cmd+Alt+0` | Reset camera zoom/pan/fit without changing source or file state. |
| Show diagnostics | `Ctrl+Alt+D` | `Cmd+Alt+D` | Open the Inspector Errors view. |
| Toggle sidebar | `Ctrl+Alt+B` | `Cmd+Alt+B` | Open or close the workspace drawer. |
| Both / Source / Preview | `Ctrl+Alt+1/2/3` | `Cmd+Alt+1/2/3` | Switch the main workspace surface. |
| Cancel | `Escape` | `Escape` | Close confirmation/drawer or clear selection when focus is not in an editor control. In the DSL editor, Escape is owned by the editor keymap: first close autocomplete, then move focus to the next control. |

The command map is implemented in `src/keyboard-commands.ts` and is covered
by focused unit tests. Commands are not handled while an unmodified editing
key is being used; editor content remains owned by CodeMirror.

## DSL editor authoring

- `Tab` indents the current line or all selected lines by two spaces in the
  editable editor. `Shift+Tab` removes one two-space indentation level where
  possible.
- `Tab` remains an editing key while the editable CodeMirror surface is
  focused; it does not move focus out of the editor. In read-only mode the
  document is preserved and normal browser focus navigation remains available.
- `Escape` closes an open completion list without leaving the editor. A second
  `Escape`, after completion is closed, moves focus to the next available
  control.
- The `Wrap lines` button is a session-only editor control. It starts off on a
  new page, exposes `aria-pressed`, and does not change source text.

## Parameter-entry keyboard behavior

Parameter controls use number inputs rather than range sliders. Users can type
integer or decimal drafts directly; spinner `step` metadata controls the
increment only and does not reject a finite manual value that is not a step
multiple. Empty, incomplete, non-finite, or out-of-range drafts stay visible
and are announced through the field's validation state without reaching the
preview worker. `Reset parameters` is immediately before the Parameters
collapse control and restores the active profile baseline, or document defaults
when no profile is selected.
