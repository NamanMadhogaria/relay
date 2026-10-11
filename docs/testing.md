# Verification: Relay 0.4.0

## Automated checks

- Production build: TypeScript and Vite.
- 52 frontend tests covering capture, permissions, composition, storage, navigation, organization, calendar handling, explicit cloud upload, restore/save failure, delete confirmation, Unicode metadata, and size validation.
- Six backend tests: two legacy retention checks and four backup-template checks for identity-scoped permissions, encryption, public-access blocking, retention, and lifecycle behavior.
- Dependency audit: zero reported vulnerabilities at verification time.

## Browser checks

A separate headless Chrome profile was used, without modifying the user's real library. A real WebM was generated from a synthetic canvas stream, stored in IndexedDB, and played through the application. Checks passed for playlist creation, meeting creation, preview playback, playback counted once across pause/resume, all workspace navigation, storage diagnostics, dark mode, and a 390-pixel viewport without horizontal page overflow.

Desktop, dark, and mobile screenshots were visually inspected. Temporary verification media is not seeded into the shipped extension.

## Live AWS checks - 11 October 2026

- relay-cloud reached CREATE_COMPLETE in ap-south-1. Legacy relay-dev retirement was confirmed UPDATE_COMPLETE.
- cfn-lint: no findings. Selected cfn-guard rules: six PASS, zero FAIL, four SKIP. CloudFormation change-set pre-deployment validation reported no findings.
- `node scripts/verify-cloud.mjs`: multipart upload and exact-byte restore; another guest denied object read, overwrite, delete, foreign-prefix listing, and bucket-wide listing. Test cloud objects deleted; noncurrent versions expire through lifecycle.
- Chrome: generated a real synthetic WebM, explicitly uploaded it to AWS, deleted its local copy, reloaded, restored from AWS, and compared all bytes. Deleted the cloud copy and confirmed the local video stayed in Library. Verified dark mode and 390-pixel layout.
- Credentials and guest identifiers were not printed or committed. Tests used fresh guest identities and synthetic files only.
- Browser cloud checks passed against both the development server and the built production bundle served locally. Reloading the packaged extension and accepting its two new AWS host permissions remains a final installation check.

## Final real-device check

These require a human-selected source and physical devices. They are not claimed as verified by the browser smoke test.

- [ ] Reload the unpacked extension from `dist`; confirm no extension errors.
- [ ] Record a 30-second screen + microphone + camera clip. Confirm speech and camera motion in preview and the downloaded WebM.
- [ ] Pause/resume and stop using Chrome's Stop sharing control; confirm one completed recording.
- [ ] Cancel the picker and deny a device permission, then retry or record without that device.
- [ ] Switch to another application during recording; check that the saved video and camera continue updating.
- [ ] Reopen Relay and verify that the video, playlist, and workspace settings persist.

No multi-hour endurance or crash-recovery guarantee is made. Entire-screen capture can include the floating preview; hide it if an extra camera preview is visible.
