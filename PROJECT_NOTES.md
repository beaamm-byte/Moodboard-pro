# MoodBoard Pro Notes

Workspace: `D:\PROYECTOS\CODE\Moodboard-pro`

## Status

- Main app is the comparator-enabled `index.html`.
- Root `index.html` stays as backup while we refactor.
- Working copy lives in `work/index.html` and now loads `work/styles.css`.
- Fabric.js canvas editor with localStorage persistence.
- Local preview server: `http://localhost:8080/index.html`.
- The comparator screen is part of the current branch and should be treated as first-class app flow.

## Current Focus

- Root `index.html` is the backup copy.
- Refactor work continues in `work/index.html`.
- First split already done:
  - `work/styles.css`
  - `work/js/state.js`
- Second split already done:
  - `work/js/canvas.js`
- Third split already done:
  - `work/js/ui.js`
- Fourth split already done:
  - `work/js/compare.js`
  - `work/js/export.js`
- Fifth split already done:
  - `work/js/editor-tail.js`
- Keep extracting by low-risk slices, then remove duplicate overrides once the structure is in place.

## Working Memory

- `autoSave` preserves viewport/pan/zoom.
- `switchCv` restores the last project/canvas.
- Export menu is a dropdown in English.
- Sticky notes, polaroid captions, and cross-canvas copy/paste were fixed.
- Project switching now hides the previous canvas while the new one loads, so the last opened project does not flash briefly.
- Layers panel has:
  - right-click context menu;
  - double-click rename;
  - expanded child rows;
  - object renaming by double-click.
- Comparator flow exists in the main HTML:
  - compare screen;
  - editable shared palette;
  - `Convertir en board` flow into `Visual Direction`;
  - project palettes in the editor sidebar.

## Important Open Issue

- Layer reordering has been resolved.
- Comparator persistence still needs verification if content disappears after reload.

## Next Steps

1. Verify comparator-generated boards survive reload and re-open correctly.
2. Verify smart guides.
3. Add rulers and manual guides.
4. Keep the export menu compact.
