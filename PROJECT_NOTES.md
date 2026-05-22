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
- Supabase backend decision pending: user will create a Supabase project and provide `SUPABASE_URL` + `SUPABASE_ANON_KEY`. Planned approach is anonymous workspace sync by default, with optional magic-link login later.
- Current blocker: after dragging/importing images into a board, reloading inside the board may lose the latest images, sometimes on the first reload. Staying inside the same project after reload is now working, but image/object persistence is still unreliable.
- 2026-05-22 investigation found the concrete image-loss error in browser console: Fabric was trying to load `mbasset:img_...` as a real URL and failing with `ERR_UNKNOWN_URL_SCHEME`. Runtime `mbasset` generation has been disabled; see `BUG_AUDIT.md`.
- New images should now remain inline as `data:image/...` in board JSON. Old boards with missing `mbasset` records will show `Save paused: missing image data` and should not be autosaved over until recovered or rebuilt.

## Next Steps

1. Fix image persistence after drag/import and reload. Reproduce by adding images to a board, reloading 2-3 times inside that board, and confirming the latest images remain.
2. Verify comparator-generated boards survive reload and re-open correctly.
3. Re-check smart guides/rulers behavior after more real use, especially pan/zoom and guide persistence.
4. Finish cleanup of legacy duplicate blocks and stale mojibake strings in `index.html`.
5. Keep the export menu compact.

## Pause Point

- As of 2026-05-16, user reports the latest changes appear to work well and is ready to switch to another project.
- Git status after PR merge/update, before this notes edit: on `refactor/modular`, clean and aligned with `origin/refactor/modular`. `main` contains the merged refactor via PR #1. After this notes update, `PROJECT_NOTES.md` is locally modified.
