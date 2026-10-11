# Relay: submission notes

## What to review

Relay 0.4.0 is a Chrome recorder and workspace with working AWS recording backups. The submission contains the source and a ready-to-load `dist` folder. No AWS Console account or Relay sign-in is required by the reviewer: the supplied build uses the deployed guest backup service.

## Approach

The primary flow is choose a screen, record, review, and organize. The studio stays in a full browser tab so closing the extension launcher does not stop capture. Optional microphone and camera setup is recoverable if permissions are denied. A separate canvas compositor embeds the camera in the resulting video, rather than only displaying it in the UI.

The workspace follows familiar video-library navigation while keeping Relay's own visual identity. Every page has real local functionality and truthful empty states. Admin tools are organizational tools for the current installation, available to all users without role checks. Metrics come from saved recordings and actual playback starts, not sample numbers.

React and TypeScript handle the UI and capture lifecycle. MediaRecorder produces WebM files, IndexedDB stores video blobs, and localStorage persists lightweight organization and appearance settings. Open Sans and assets are bundled. Local recording works offline; cloud backup uses Amazon S3 and Cognito guest access in Mumbai.

The Cloud backups page explicitly uploads recordings, lists remote copies, restores them to Library, and deletes only cloud copies. Multipart upload limits extra transfer buffering. IAM scopes each guest to its own recording folder. No long-lived AWS key or sign-in screen is shipped. The guest identifier must remain in extension storage; this design does not provide authenticated account recovery.

## Thoughtful use of AI

AI assisted with implementation, refactoring, browser test orchestration, and documentation. Generated work was checked using TypeScript, focused Vitest tests, actual Chrome interactions with synthetic media, and visual inspection. Browser permission and hardware-dependent checks are documented separately rather than presented as automated proof.

An AWS transcription prototype was investigated and tested. Although private uploads worked, the account rejected Transcribe and Translate requests. Captions were removed. AWS remains integrated for recording storage and restore, independently of AI processing. AI-powered product features are not claimed in this submission.

## Key challenges

1. **Capture lifecycle:** permission requests may finish after the user stops sharing. Cleanup and state checks prevent late streams from remaining active.
2. **Camera inclusion:** compositing must preserve the screen aspect ratio and place a circular overlay inside the actual encoded file. A floating preview is a separate convenience, with an entire-screen duplication caveat.
3. **Long recordings:** removing an arbitrary timer is different from guaranteeing unlimited memory. The release permits long recordings and documents memory/storage constraints.
4. **Truthful workspace behavior:** local playback is distinct from public views; calendar export is distinct from a meeting bot; metadata export is distinct from a video backup.
5. **Cloud availability and authorization:** deployment alone did not prove service behavior. The new backup integration was tested against live AWS with real video bytes and two guest identities. Cross-guest reads, writes, deletes, and listing were denied. Cloud errors leave local videos usable.

## Suggested five-minute demo

For a complete spoken walkthrough in simple English, see [the demo script](docs/demo-script.md). It includes presentation actions and short answers to likely interview questions.

1. Open Recording studio. Enable the microphone and camera, choose a tab, and record a short explanation.
2. Pause, resume, finish, rename, preview, and download the video.
3. Open Library, favorite the clip, then find it in For you.
4. In Manage, add a folder and tags. Search for a tag in the top search field.
5. Create a playlist, add the clip, and show ordering controls.
6. Add a meeting agenda, link the clip, and export its calendar event.
7. Show Insights, rename the workspace, and switch between light and dark mode.
8. Open Cloud backups, upload the clip, refresh, and show Restore to Library. Explain S3 storage, temporary Cognito credentials, independent local/cloud copies, and guest identity persistence.
9. Open Relay Tools to explain local storage and the absence of roles, sign-in, and billing.

## Handoff boundaries

This is a take-home submission with local organization and optional cloud video backups, not a complete multi-tenant SaaS service or a full Loom clone. There are no public video links, shared accounts, meeting auto-capture, billing, or caption generation. Guest access has no server-enforced per-user storage quota or authenticated recovery. A reviewer should run the real-device checklist in `docs/testing.md` before relying on a particular camera/microphone combination.
