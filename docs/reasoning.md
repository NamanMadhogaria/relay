# Design decisions: Relay 0.3.0

## Objective
Prove the actual screen + voice capture path before adding cloud dependencies. Improve the experience with an explicit microphone check, calm readiness state, predictable controls, immediate preview, and visible local-save status.

## Architecture
- React and TypeScript provide typed UI state and familiar components; Vite bundles scripts locally for Manifest V3 CSP.
- An extension page owns MediaRecorder and the media streams. The service worker only opens/focuses that page. Popup lifetime must not control a recording.
- Chrome's user-selected screen picker preserves user control over the capture source.
- No host, browsing-history, or content-script permissions are requested in the current release.
- WebM VP8/Opus is selected only after a runtime support check.
- A monotonic clock excludes paused time. Permission choice and countdown are separate from recording time.
- IndexedDB stores completed media. We wait for transaction completion before showing “saved”. If storage fails, the preview and download remain accessible.

## Deliberate tradeoffs
Media is buffered until recording finishes. Version 0.1.7 removes the original five-minute and 100 MB cutoffs at the user's request. Available browser memory and storage remain practical limits, and this does not provide crash recovery or a guarantee of multi-hour reliability. Streaming to disk and periodic durable chunks with a verified recovery strategy belong in a later hardening milestone.

The current release is entirely local and requires no account or cloud connection. An earlier AWS caption prototype successfully handled uploads, but AI services were blocked by the account. Captions were then removed at the owner's request. The extension has no AWS host permissions and blocks network connections. The backend folder now documents retirement of processing resources while retaining existing private data; see backend/DEPLOYMENT.md for the last verified status.

## Optional camera overlay
The user requested webcam support after the initial scope. Camera is opt-in and previews before capture. A canvas combines the selected screen with a centered circular crop of the camera; its captureStream video track is joined with the microphone track before MediaRecorder. This embeds the face in the saved file without content scripts or page overlays. Screen-only recordings retain their direct stream path. A worker drives drawing instead of requestAnimationFrame so hidden-tab animation suspension is avoided, though hardware/background performance remains a manual verification item. Output is bounded to 1080p and the overlay position is fixed to keep complexity and CPU use manageable. Camera disconnects stop the clip instead of silently recording a frozen face. Resources are released on stop, cancel, failure, and leaving the preview.

## Floating camera and recording again

The saved canvas overlay alone cannot show the presenter their face while they work in another application. A separate Document Picture-in-Picture window previews the same camera stream above other windows and offers pause/finish controls. It opens directly from a camera button gesture, before waiting for camera permission. Closing it detaches its video element without stopping capture; recorder cleanup closes it and also invalidates pending window requests. Chrome controls the initial position, so the presenter can drag it to bottom-right. Entire-screen capture may include this preview in addition to the embedded overlay; the UI explains this and lets the presenter hide it. Actual laptop behavior remains a manual test.

New recording remains visible in the studio and completed-video review. It clears the current selection while preserving the saved library, and keeps the existing warning before abandoning a clip that failed to save. Recording studio navigation also returns to setup after review.

## AI-assisted workflow
Codex scaffolded the app, capture hook, storage layer, UI, and focused tests. Official Chrome capture, MDN MediaRecorder, and Vite documentation were consulted. Automated checks must be distinguished from the human-verified screen-picker, microphone, and video playback test. Do not claim those manual checks passed until they have been performed.

## References
- https://cloudscape.design/foundation/visual-foundation/typography/
- https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture
- https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- https://developer.chrome.com/docs/web-platform/document-picture-in-picture
- https://vite.dev/guide/

## Workspace and access

All twelve pages are available without sign-in or roles. IndexedDB holds video blobs; localStorage holds lightweight workspace metadata. Playlists reference recordings rather than duplicating them. Deleting a recording removes its playlist references and clears linked meetings without deleting their agendas. Analytics count local playback sessions, not unique people or external viewers.

## Scalability boundary

This release demonstrates separation of UI, capture, compositing and persistence plus focused automated tests. It is not a multi-user cloud service. Future hardening would persist recording chunks progressively, add recovery and paginated metadata queries, and use authorized background processing for optional cloud features. These are design directions, not implemented capabilities.

## AI scope

AI assisted development and verification. There is no AI-powered end-user feature in the current release. The submission notes state this explicitly rather than presenting removed or blocked features as working.
