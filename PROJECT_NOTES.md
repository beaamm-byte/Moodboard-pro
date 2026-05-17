# MoodBoard Pro Notes

Workspace: `D:\PROYECTOS\CODE\Moodboard-pro`

## Status

- Main app is the comparator-enabled `index.html`.
- Root `index.html` is the active modular entrypoint.
- The app is split across `index.html`, `styles.css`, and `js/*.js`.
- Fabric.js canvas editor with IndexedDB-backed workspace state plus localStorage fallback.
- Local preview server: `http://localhost:8080/index.html`.
- The comparator screen is part of the current branch and should be treated as first-class app flow.

## Current Focus

- Root files are the active working copy.
- Current working branch is `refactor/modular`.
- PR #1 from `refactor/modular` into `main` was merged on 2026-05-16.
- Keep `refactor/modular`; user wants to continue working from this branch.
- Keep extracting by low-risk slices, then remove duplicate overrides once the structure is in place.
- Preferred Codex model for future sessions: `gpt-5.5`.

## Working Memory

- `autoSave` preserves viewport/pan/zoom.
- `switchCv` restores the last project/canvas.
- Export menu is a dropdown in English.
- Image storage is moving out of `localStorage` into IndexedDB-backed assets so image-heavy projects do not hit quota as fast.
- `.mb` export now bundles referenced image assets so project/workspace exports remain portable.
- `Import > Project` now only compacts the imported project bundle instead of scanning the entire workspace.
- Workspace persistence now prefers IndexedDB so project lists remain available even when localStorage gets tight.
- Workspace load now mirrors back to `localStorage` after an IndexedDB read, so subsequent reloads do not start blank.
- `Import > Project` now returns to the home screen after import so the newly added project is visible immediately.
- The root `index.html` has been trimmed further; the main home/project/editor duplicates now live in `js/ui.js`, `js/state.js`, `js/canvas.js`, and `js/editor-tail.js`.
- The live search dropdown logic now lives only in `js/ui.js`; the duplicate block was removed from the root HTML.
- `renderPropContent` now lives only in `js/editor-tail.js`; the duplicate version was removed from the root HTML.
- The properties panel helpers now live in `js/properties.js`; the root HTML no longer carries that block.
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
- Rulers/manual guides are implemented and currently reported as working well.
- Rulers are enabled by default for projects.
- The `Rulers` control now sits with the editor tools next to `Select`, `Draw`, and `Pan`.
- The redundant topbar `Frame` button next to Zen Mode was removed; image framing remains in the properties panel.

## Important Open Issue

- Layer reordering has been resolved.
- Comparator persistence still needs verification if content disappears after reload.

## Next Steps

1. Verify comparator-generated boards survive reload and re-open correctly.
2. Re-check smart guides/rulers behavior after more real use, especially pan/zoom and guide persistence.
3. Finish cleanup of legacy duplicate blocks and stale mojibake strings in `index.html`.
4. Keep the export menu compact.

## Pause Point

- As of 2026-05-16, user reports the latest changes appear to work well and is ready to switch to another project.
- Git status after PR merge/update, before this notes edit: on `refactor/modular`, clean and aligned with `origin/refactor/modular`. `main` contains the merged refactor via PR #1. After this notes update, `PROJECT_NOTES.md` is locally modified.
