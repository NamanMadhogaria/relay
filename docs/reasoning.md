# Design decisions: Relay 0.4.0

## Objective
Prove the actual screen + voice capture path before adding cloud dependencies. Improve the experience with an explicit microphone check, calm readiness state, predictable controls, immediate preview, and visible local-save status.

## Architecture
- React and TypeScript provide typed UI state and familiar components; Vite bundles scripts locally for Manifest V3 CSP.
- An extension page owns MediaRecorder and the media streams. The service worker only opens/focuses that page. Popup lifetime must not control a recording.
- Chrome's user-selected screen picker preserves user control over the capture source.
- Host permissions are limited to the configured S3 bucket and regional Cognito identity endpoint. No browsing-history or content-script permissions are requested.
- WebM VP8/Opus is selected only after a runtime support check.
- A monotonic clock excludes paused time. Permission choice and countdown are separate from recording time.
- IndexedDB stores completed media. We wait for transaction completion before showing “saved”. If storage fails, the preview and download remain accessible.

## Deliberate tradeoffs
Media is buffered until recording finishes. Version 0.1.7 removes the original five-minute and 100 MB cutoffs at the user's request. Available browser memory and storage remain practical limits, and this does not provide crash recovery or a guarantee of multi-hour reliability. Streaming to disk and periodic durable chunks with a verified recovery strategy belong in a later hardening milestone.

Recording and organization remain local, with optional working AWS backups. An earlier AWS caption prototype handled uploads, but AI services were blocked by the account, and captions were removed. Removing captions should not remove useful AWS integration: the independent relay-cloud stack supplies S3 storage and Cognito guest access for recording upload and restore. The old relay-dev stack reached UPDATE_COMPLETE and retains earlier private data; the app does not access it.

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

All thirteen pages are available without sign-in or admin roles. IndexedDB holds video blobs; localStorage holds lightweight workspace metadata and the current cloud guest identifier. Playlists reference recordings rather than duplicating them. Deleting a local recording removes playlist references and clears linked meetings without deleting their agendas or cloud copy. Analytics count local playback sessions, not unique people or external viewers.

## AWS recording backups

S3 stores cloud video objects. Cognito identity pools provide temporary guest credentials so the browser can call S3 directly without permanent keys or a Relay login. IAM binds the guest role to this pool and scopes object access and listing to recordings/<guest-identity>/. Live tests verify cross-guest read/write/delete/list denial. Guest IDs stay local and must not be published; guest identity is not proof of a person's identity.

Uploads are explicit, with progress, cancellation, errors, and refresh. Multipart transfers use bounded concurrency. Each WebM carries compact S3 metadata (title, duration, capture flags, creation date), avoiding a second database and separate video/metadata consistency problems. Restore saves to IndexedDB before reporting success. Re-upload updates the cloud snapshot; local edits do not automatically synchronize. Workspace tags, folders, playlists, and agendas remain local.

The bucket blocks public access, enforces HTTPS, uses SSE-S3 encryption, enables versioning, and retains data on stack deletion. Prior versions expire after seven days; incomplete uploads expire after one day. Encrypted access logs expire after 30 days. SSE-S3 avoids an extra customer-managed KMS key charge for this submission. The account has no dedicated CloudTrail trail; durable management audit retention and selected data events are recommended before wider production use.

The 1 GB/video app limit is not an IAM-enforced quota or cost cap. Guest identity issuance is public. Broad public distribution needs enforced quotas, abuse controls, budget monitoring, and preferably authenticated recovery. Clearing extension data may lose the guest identifier and in-app access to backups. This protects selected videos independently of local copies; it is not full workspace or cross-device recovery.

## Scalability boundary

The interface, capture, compositing, local persistence, and cloud transfer are separated. AWS handles object storage and credential issuance without an always-running app server. The cloud SDK loads only when its page opens. Listing uses pagination and bounded metadata requests. This is not a shared team workspace. Future work includes durable recording chunks, recovery, enforced quotas, and authenticated cross-device access.

## AI scope

AI assisted development and verification. There is no AI-powered end-user feature in the current release. The submission notes state this explicitly rather than presenting removed or blocked features as working.
