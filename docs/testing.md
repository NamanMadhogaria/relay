# Verification: Relay 0.3.0

## Automated checks

- Production build: TypeScript and Vite.
- 44 frontend tests covering recorder timing and permission recovery, camera composition/cleanup, floating camera behavior, IndexedDB storage, new-recording navigation, theme, playlists, search, unrestricted management navigation, workspace persistence, deletion references, storage failure, and calendar escaping/timezone handling.
- Two infrastructure retention tests verify that only private stateful data and its bucket policy remain, with retain policies and temporary-data expiry.
- Dependency audit: zero reported vulnerabilities at verification time.

## Browser checks

A separate headless Chrome profile was used, without modifying the user's real library. A real WebM was generated from a synthetic canvas stream, stored in IndexedDB, and played through the application. Checks passed for playlist creation, meeting creation, preview playback, playback counted once across pause/resume, all workspace navigation, storage diagnostics, dark mode, and a 390-pixel viewport without horizontal page overflow.

Desktop, dark, and mobile screenshots were visually inspected. Test media and profile data stay under ignored `tmp/`; they are not seeded into the shipped extension.

## Final real-device check

These require a human-selected source and physical devices. They are not claimed as verified by the browser smoke test.

- [ ] Reload the unpacked extension from `dist`; confirm no extension errors.
- [ ] Record a 30-second screen + microphone + camera clip. Confirm speech and camera motion in preview and the downloaded WebM.
- [ ] Pause/resume and stop using Chrome's Stop sharing control; confirm one completed recording.
- [ ] Cancel the picker and deny a device permission, then retry or record without that device.
- [ ] Switch to another application during recording; check that the saved video and camera continue updating.
- [ ] Reopen Relay and verify that the video, playlist, and workspace settings persist.

No multi-hour endurance or crash-recovery guarantee is made. Entire-screen capture can include the floating preview; hide it if an extra camera preview is visible.
