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
| Cancel | `Escape` | `Escape` | Close confirmation/drawer or clear selection when focus is not in an editor control. |

The command map is implemented in `src/keyboard-commands.ts` and is covered
by focused unit tests. Commands are not handled while an unmodified editing
key is being used; editor content remains owned by CodeMirror.
