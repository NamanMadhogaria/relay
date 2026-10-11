# Relay: submission notes

## What to review

Relay is a working local Chrome recorder and workspace. The submission contains the source and a ready-to-load `dist` folder. No AWS account or app sign-in is required by the reviewer.

## Approach

The primary flow is choose a screen, record, review, and organize. The studio stays in a full browser tab so closing the extension launcher does not stop capture. Optional microphone and camera setup is recoverable if permissions are denied. A separate canvas compositor embeds the camera in the resulting video, rather than only displaying it in the UI.

The workspace follows familiar video-library navigation while keeping Relay's own visual identity. Every page has real local functionality and truthful empty states. Admin tools are organizational tools for the current installation, available to all users without role checks. Metrics come from saved recordings and actual playback starts, not sample numbers.

React and TypeScript handle the UI and capture lifecycle. MediaRecorder produces WebM files, IndexedDB stores video blobs, and localStorage persists lightweight organization and appearance settings. Open Sans and all assets are bundled; the application requires no network after installation.

## Thoughtful use of AI

AI assisted with implementation, refactoring, browser test orchestration, and documentation. Generated work was checked using TypeScript, focused Vitest tests, actual Chrome interactions with synthetic media, and visual inspection. Browser permission and hardware-dependent checks are documented separately rather than presented as automated proof.

An AWS transcription prototype was investigated and tested. Although private uploads worked, the account rejected Transcribe and Translate requests. The owner then chose to remove captions. This release removes that feature, its client permissions, and cloud processing instead of presenting an unreliable or simulated AI feature. AI-powered product features are not claimed in this submission.

## Key challenges

1. **Capture lifecycle:** permission requests may finish after the user stops sharing. Cleanup and state checks prevent late streams from remaining active.
2. **Camera inclusion:** compositing must preserve the screen aspect ratio and place a circular overlay inside the actual encoded file. A floating preview is a separate convenience, with an entire-screen duplication caveat.
3. **Long recordings:** removing an arbitrary timer is different from guaranteeing unlimited memory. The release permits long recordings and documents memory/storage constraints.
4. **Truthful workspace behavior:** local playback is distinct from public views; calendar export is distinct from a meeting bot; metadata export is distinct from a video backup.
5. **Cloud availability:** successful infrastructure deployment did not mean the account could run AI jobs. Removing the feature also removed automatic uploads and external service dependencies.

## Suggested five-minute demo

For a complete spoken walkthrough in simple English, see [the demo script](docs/demo-script.md). It includes presentation actions and short answers to likely interview questions.

1. Open Recording studio. Enable the microphone and camera, choose a tab, and record a short explanation.
2. Pause, resume, finish, rename, preview, and download the video.
3. Open Library, favorite the clip, then find it in For you.
4. In Manage, add a folder and tags. Search for a tag in the top search field.
5. Create a playlist, add the clip, and show ordering controls.
6. Add a meeting agenda, link the clip, and export its calendar event.
7. Show Insights, rename the workspace, and switch between light and dark mode.
8. Open Relay Tools to explain local storage and the absence of roles, sign-in, and billing.

## Handoff boundaries

This is a take-home submission with a local workspace, not a multi-tenant SaaS service or a full Loom clone. There are no public video links, shared accounts, meeting auto-capture, billing, or caption generation. A reviewer should run the short real-device checklist in `docs/testing.md` before relying on a particular camera/microphone combination.
