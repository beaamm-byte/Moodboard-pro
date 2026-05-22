# MoodBoard Pro Bug Audit

Date: 2026-05-22

## Validations Run

- `node --check` passed for all files in `js/*.js`.
- Inline scripts inside `index.html` compile with `vm.Script`.
- `index.html` responds over a local HTTP server.
- A full browser automation test could not be completed from this shell because Edge DevTools remote debugging did not become reachable.

## Confirmed Critical Bug: Image Loss On Reload

Evidence from browser console:

- `GET mbasset:img_... net::ERR_UNKNOWN_URL_SCHEME`
- `fabric.min.js:1 Error loading mbasset:img_...`

Root cause:

- The app was serializing some images as `mbasset:<key>`.
- On reload, `normalizeAssetRefs()` must replace `mbasset:<key>` with a real `data:image/...` URL from IndexedDB.
- When that asset key is missing or not loaded, Fabric receives `mbasset:<key>` as the image `src`.
- The browser cannot load the custom `mbasset:` scheme, so Fabric drops the image.
- Once autosave runs after that partial load, the board can be overwritten without those images.

Mitigation applied:

- Runtime conversion from images to `mbasset` has been disabled.
- `fabric.Image.prototype.toObject()` no longer emits `mbasset:` sources.
- `compactWorkspaceImageAssets()` now returns `false`, so automatic compaction no longer rewrites inline images into `mbasset`.
- Comparator board creation no longer registers images as assets in the background.
- Local/dragged/pasted images are added as `data:image/...` and immediately autosaved.
- If an old board still contains unresolved `mbasset:` refs, autosave is paused with `Save paused: missing image data` so the app does not overwrite the board with a partially loaded version.

Residual risk:

- Images already saved only as `mbasset:<key>` can only be recovered if their IndexedDB asset still exists.
- If the asset record is missing, the original image data is gone from the project JSON and cannot be reconstructed by code.

## Confirmed Bug: Misleading Save Status

Issue:

- `autoSave()` showed `Saved ...` even when `saveLS()` returned `false`.

Impact:

- User could believe a board was persisted when IndexedDB/localStorage did not actually save it.

Mitigation applied:

- `autoSave()` now shows `Save failed` and a toast when `saveLS()` returns `false`.

## Confirmed Risk: Async Saves Not Awaited In Many UI Actions

Examples:

- Canvas duplication.
- Canvas creation/rename/delete.
- Project create/rename/trash/restore/delete.
- Switching canvas.

Impact:

- Most are lower risk than image operations, but rapid reload/navigation can race against IndexedDB writes.

Recommendation:

- Convert these calls to `await saveLS()` in follow-up work, especially actions that change project/canvas lists.

## Confirmed Risk: Duplicate Function Definitions

Duplicated functions exist between root `index.html` and modules:

- `addObj`
- `addSticky`
- `addText`
- `applyObjectControls`
- `attachStickyDblClick`
- `createStickyGroup`
- `goHome`
- `initCanvas`
- `normalizeTextBox`
- `showScreen`

Impact:

- Script order decides which implementation is active.
- Future fixes can be made in the wrong copy and appear to do nothing.
- This directly increases the risk of regressions like copy/paste or image persistence breaking while editing unrelated code.

Recommendation:

- Remove duplicate root implementations only after verifying the module copy is active and behavior-equivalent.
- Do this in small commits, one duplicated block at a time.

## Confirmed Risk: `saveLSLegacy` Still Exists

Issue:

- `index.html` still contains `saveLSLegacy()`.

Impact:

- It is not currently called, but it duplicates old persistence behavior and can confuse future maintenance.

Recommendation:

- Remove it after the current image persistence issue is confirmed fixed.

## Confirmed Risk: Export/Import Mutates Workspace

Issue:

- Export/import paths call `compactWorkspaceImageAssets(...)`.
- This now returns `false`, but the previous behavior mutated project JSON by converting inline images to `mbasset`.

Impact:

- Exporting should not change the active workspace.
- Import should not rewrite image storage in the background unless that operation is proven safe.

Recommendation:

- Keep export as a pure read operation.
- If asset bundling is reintroduced, build a cloned export payload instead of mutating `projects`.

## Confirmed Risk: Remote Images Can Become Unrecoverable

Issue:

- Images added by URL are stored as remote URLs.

Impact:

- They survive reload while the remote URL works.
- If the source server blocks hotlinking, changes CORS, deletes the image, or goes offline, the board can lose that visual.

Recommendation:

- For reliability, convert remote images to local `data:image` only when CORS allows reading them.
- If CORS blocks reading, warn the user that the image remains externally linked.

## Security/Robustness Risk: Inline HTML

Issue:

- Several UI paths use `innerHTML`.
- Most user-facing values are escaped with `escHtml`, but not all dynamic strings are obviously sanitized.

Impact:

- Lower immediate risk in a local-only app, but this matters if Supabase sync/sharing is added.

Recommendation:

- Audit every `innerHTML` path before publishing multi-user sync.
- Prefer DOM node creation for user-controlled text.

## Manual Verification Checklist

Use a fresh board after hard refresh:

1. Add image from PC via `Image > Browse local file`.
2. Move it.
3. Wait for `Saved ...`.
4. Reload once.
5. Confirm image remains and position is preserved.
6. Reload three more times.
7. Drag image from desktop into canvas.
8. Repeat reload checks.
9. Create a board from comparator.
10. Reload three times and confirm reference images remain.
11. Copy object from one board, switch board, press `Ctrl+V`, confirm paste still works.

## Console Check

After the fix, console should not show new errors like:

```text
GET mbasset:... net::ERR_UNKNOWN_URL_SCHEME
Error loading mbasset:...
```

If these errors still appear for newly added images, the app is still serializing new images as `mbasset` somewhere and that path must be removed.
