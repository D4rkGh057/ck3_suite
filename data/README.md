# data/

Local copies of Crusader Kings III game files. Everything in this folder
except this README and `traits.json` is git-ignored: game files are never
committed or redistributed.

## Expected folders

Copy these from the game directory (reference version: 1.20.1.2 "Crozier"):

| Folder here  | Source in the game (`.../Crusader Kings III/game/`) | Purpose                                  |
|--------------|-----------------------------------------------------|------------------------------------------|
| `traits/`    | `common/traits/`                                    | Trait definitions (designer cost, opposites) |
| `defines/`   | `common/defines/`                                   | Age cost table and designer constants    |
| `script_values/` | `common/script_values/` (only `02_ruler_designer_values.txt` is read) | Skill point costs |
| `spanish/`   | `localization/spanish/`                             | Localized trait names (or use `english/`) |

Typical Steam path on Windows:

```
C:\Program Files (x86)\Steam\steamapps\common\Crusader Kings III\game
```

## Generated output

- `traits.json`: produced by `extractor/extract.py` from the folders above.
  This file is the only data the web page needs.

## After each game patch

1. Replace the folders above with fresh copies.
2. Re-run the extractor.
3. Review the diff of `traits.json`.
