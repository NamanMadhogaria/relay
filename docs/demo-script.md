# Relay 0.4.0 - complete product demo script

This is the full walkthrough, including all thirteen tabs, AWS backup and restore, editing, exports, deletion, and recovery situations. Allow about 18 to 25 minutes with clicking and uploads. There is no need to rush.

Read the normal paragraphs aloud. Instructions inside [square brackets] are actions for you. Do not read them aloud. The optional recovery demonstrations at the end can be recorded separately if the reviewer wants more detail.

## Prepare before recording the demo

- Reload Relay from the existing E:\Projects\LOOM\dist folder. Accept its AWS permissions if Chrome asks. Keep the same installation and Chrome profile.
- Test a short screen, microphone, and camera recording. Check the downloaded video too.
- Use a separate tool to record this presentation, so the reviewer can see you start and stop Relay. Check that the two tools can use your devices together.
- Use a clean browser tab with no private messages, passwords, or personal files visible.
- Prepare two short disposable recordings called **Demo sample A** and **Demo sample B**. These are for reordering and deletion. Do not use important recordings for these steps.
- Keep your final presentation recording outside Relay's test library so the cleanup steps cannot delete it.
- Keep internet access available for the AWS section. Have the GitHub repository and reasoning PDF ready.
- Rehearse once. Only describe a result as successful after the screen shows it succeeded. Pause your explanation while a preview plays to avoid speaking over its audio.

## 1. Introduction and opening the extension

[Show the Relay icon in Chrome. Click it to open the studio.]

Hello, my name is Naman Madhogaria.

This is Relay, the Chrome extension I built for this assignment.

The assignment was to build a product similar to Loom and improve the user experience. I focused on a simple journey: prepare, record, review, organize, and back up.

Relay records a screen, a window, or a browser tab. It can also include my microphone and camera.

The recording first saves on this device. I can then choose to back it up to AWS. I do not need a Relay account to use these features.

I will show the complete flow, explain the main decisions, and finish with the challenges and testing.

## 2. Recording studio - microphone and camera setup

[Show the microphone switch. Turn it on, click Check microphone, and allow access if prompted. Speak and show the level indicator.]

This is Recording studio. Before recording, I can check my microphone. The indicator helps me see whether the browser is receiving sound.

This is useful because a recording is not helpful if the voice is missing.

[Show the microphone off option, then turn it back on for this demo.]

If I only need a silent screen recording, I can turn the microphone off. The current audio feature records my microphone, not the computer's system or tab audio.

[Enable the camera and allow access. Show the circular preview.]

The camera is also optional. I can check how I look before starting.

[Click Show floating camera. Move the floating window if needed.]

This floating window helps me see my face while I work in another window. It also gives me recording controls.

[Show Hide floating camera, then choose whether to keep it visible for this demonstration.]

If I share my entire screen, the floating window may also be captured. I can hide it to avoid showing my face twice. Hiding this window does not remove the camera that is placed inside the saved video.

## 3. Choose a source, record, pause, and finish

[Click Choose screen & record. Show Chrome's tab, window, and entire-screen choices without exposing private content. Select the clean demo tab.]

Chrome asks what I want to share. I can choose one tab, one window, or my entire screen.

For this example, I will choose this tab. The other options follow the same recording flow after I select the source.

[Wait for the countdown. Record ten to fifteen seconds of simple activity.]

This is my Relay test recording. I am showing the screen, speaking into the microphone, and including my camera.

[Pause. Wait briefly. Resume.]

I can pause if I need time to prepare something. Then I can continue the same video. Paused time is not included in the recording timer.

[Click Finish recording. Wait for the preview and the saved message.]

Now I will finish. Relay prepares the video and saves it on this device.

The recording runs in this full browser tab. Closing the small extension launcher does not stop it. I keep the studio tab open while recording.

## 4. Preview, rename, download, and record again

[Play a few seconds. Check the screen, voice, and camera. Pause the video before continuing.]

Here I can check the result immediately. The camera is part of the actual video, so it also appears in the downloaded file.

[Change the title to Relay product demo. Use the title save control.]

I can give the recording a clear name. This makes it easier to find later.

[Click Download. Show the downloaded file if convenient.]

Download gives me a separate video file in WebM format. This is useful for sending the video or keeping another copy.

[Click New recording. Show the microphone, camera, and Choose screen & record controls again.]

New recording takes me back to setup. It does not remove the video I just saved.

## 5. Library - playback, favorites, search, sorting, and download

[Open Library. Find Relay product demo.]

Library is the main place for my saved recordings. Each card shows the title, date, duration, and file size.

[Open the recording, play briefly, then return to Library.]

I can open a recording to review it again.

[Click the heart on the recording. Turn Favorites only on and off.]

The heart marks a favorite. Favorites only helps me focus on the recordings I use often.

[Use the top search field to search for Relay product demo. Submit the search. Clear it afterward.]

The search can find recordings by title, folder, or tag. I will add a folder and tags in the next step.

[Change Sort between Newest first, Oldest first, and Title. Return to Newest first.]

Sorting changes the order of the list. It does not change the recordings themselves.

[Point to the download icon beside the delete icon. Download once if needed.]

I can also download directly from the library card without opening the preview.

## 6. Manage - edit details and use organization filters

[Open Manage. Expand the details for Relay product demo.]

Manage brings the editing tools together in one place. There is no separate admin login.

[Keep the title Relay product demo. Set Folder to Product demos. Set Tags to demo, project. Click Save details.]

I can change the title, add a folder, and add tags. Tags are small labels that make a recording easier to find.

[Search for project inside Manage. Clear the search. Point to Play and Download.]

I can search this page too. I can also play or download a video from here.

[Return to Library. Choose Product demos from Folder. Search for project. Then click Clear filters.]

The folder and tags now work in Library. Clear filters brings the full list back.

I will show confirmed deletion near the end, using only the disposable sample videos.

## 7. Cloud backups - connect and upload to AWS

[Open Cloud backups. Click Connect to AWS. Wait for the success message.]

This is the AWS part of the product.

Connecting loads the cloud recordings for this installation. It does not automatically upload my library.

Amazon S3 stores the video files in the Mumbai region. Amazon Cognito gives this installation temporary guest access. IAM controls which files that guest can use.

There is no permanent AWS access key or AWS password inside the extension.

[Under On this device, click Back up beside Relay product demo. Show progress and wait for the success message.]

I choose which recording to upload. Relay shows progress while the video is sent to AWS.

My local copy stays on this device. The cloud copy is a separate backup.

[Show Relay product demo under In AWS. Click Refresh cloud library.]

The cloud list comes from AWS. Refresh checks it again.

[Expand AWS connection details.]

Here I can see the region and bucket used by this build. The backup includes the video, its title, duration, and capture details. Folders, tags, playlists, meeting agendas, and other workspace settings stay local.

AWS storage and transfers can use credits. The app supports cloud videos up to one gigabyte each. That limit does not act as an account spending limit.

## 8. Cloud backups - update, restore, and independent deletion

### Update an existing backup

[Back up the same demo recording again and wait for completion.]

Backing up the same recording again updates its cloud copy. If I change a local title later, I need to back it up again to update that cloud snapshot. This is not automatic synchronization.

### Restore when a local copy already exists

[Click Restore to Library. Show the replacement confirmation and choose Cancel for now.]

Because this recording already exists locally, Relay asks before replacing it. I can cancel and keep the current local version.

### Restore a recording that is missing locally

[First download Relay product demo and confirm its AWS backup is visible. Go to Library. Click its delete icon, then confirm Delete local copy.]

For this test, I am removing only the local demo copy. I already have a download and an AWS backup.

[Return to Cloud backups. Click Connect to AWS if the page requires it. Find the cloud recording. Click Restore to Library and wait for success.]

The video is still in AWS. Restore downloads it and saves it back into the local library.

[Open Library and play the restored video briefly.]

The recording is available again. The cloud backup is also still there.

The restore brings back the recording details, but not the local folder, tags, or playlist links that were removed with the local copy. Those belong to the local workspace.

### Delete a cloud copy without deleting the local video

[Return to Cloud backups and connect if needed. Click the cloud delete icon for the demo recording. Read the confirmation, then confirm.]

Now I am deleting the cloud copy only. The local video stays in Library.

S3 keeps earlier versions for a limited time. This app's policy expires those older versions after seven days.

[Show that the local video remains. Back it up again if you want it available in AWS at the end of the demo.]

There is an important limit to the no-login design. I must keep this Chrome profile and extension storage. Clearing all extension data can remove the guest identifier and lose in-app access to this cloud space. This is not account recovery on a new device.

## 9. For you - quick access

[If necessary, favorite Relay product demo again after the restore. Open For you.]

For you is a quick starting page. It brings together favorite videos and recently created recordings.

This helps me reach useful videos without searching the full library every time.

[Open a favorite, return, and show the Library shortcut.]

I can open a video from here or move to the full library.

## 10. Playlists - create, add, reorder, rename, and remove

[Open Playlists. Create a playlist called Product walkthrough. Add Relay product demo and Demo sample A.]

Playlists group related recordings. For example, I can keep a project introduction and its follow-up videos together.

Adding a recording to a playlist does not make another copy of the video file.

[Use the up and down arrows to change the order.]

I can decide which video should appear first.

[Open one video from the playlist, then return.]

I can play an individual video from the list. This version does not automatically play the whole playlist as one sequence.

[Rename the playlist to Relay walkthrough. Click Save name.]

I can also change the playlist name.

[Remove Demo sample A from the playlist, then show that it remains available to add again.]

Removing a video from the playlist does not delete it from Library.

[Create an extra playlist called Delete test. Add Demo sample A, delete the playlist, and confirm. Keep Relay walkthrough.]

Deleting a playlist removes the group. Its recordings stay in the library.

## 11. Meetings - plan, edit, link, play, export, and delete

[Open Meetings. Enter Project review, a future date and time, and the agenda: Review the recording and discuss feedback. Click Add meeting.]

Meetings is a simple planning tool. I can store an agenda with a date and time.

[Choose Relay product demo in Linked recording. Click Play recording, then return to Meetings.]

I can link a saved recording to the agenda. This keeps the explanation close to the meeting plan.

[Click Edit meeting. Change the agenda. Click Save meeting.]

I can update the meeting details when the plan changes. Cancel edit lets me leave without saving an edit.

[Click Export calendar event. Show the downloaded .ics file.]

This downloads a calendar event file that I can import into a calendar app. The exported event is thirty minutes long.

This page does not join calls, record meetings automatically, or send invitations.

[Create a disposable meeting called Delete test, link Demo sample A, then delete that meeting and confirm.]

Deleting a meeting removes its agenda entry. It does not delete the linked video.

[Point to Record a video on a meeting with no linked recording, if available.]

If a meeting has no linked recording, this button opens the studio. After recording, I return and select the video myself. The link is not added automatically.

## 12. Recent - created and played recordings

[Open Recent. Show both choices in its selector.]

Recent helps me find what I worked on most recently.

I can look at recently created recordings or recently played recordings. These are different because I may watch an older video today.

[Open a video and return to the recently played view.]

The played view helps me return to that video quickly.

## 13. Personal settings - name, appearance, and persistence

[Open Personal settings. Enter Naman and click Save name.]

I can personalize the workspace with my display name.

[Change Appearance to dark, then light. Also show the top-bar theme button.]

I can choose light or dark mode. The top button offers the same quick change.

[Refresh Relay when no recording or transfer is running. Return to Personal settings.]

My saved name and appearance remain after refresh. They are stored in this browser.

## 14. Overview - understand the workspace

[Open Overview. Point to the recording count, playlist count, storage total, and recent recordings.]

Overview gives me a quick summary of the local workspace.

The totals come from saved data. They are not fixed sample numbers. Video storage here refers to local recordings, not the AWS account's total storage.

[Use one management shortcut, then return.]

These shortcuts help me reach the management pages directly.

## 15. Insights - activity, date filters, and CSV export

[Open Insights. Show its date-range choices and change the range.]

Insights shows how the local workspace is being used. I can change the date range to focus on recent activity or a longer period.

[Point to the available totals and charts.]

The charts use real local recording and playback information. Playback sessions are not unique people or public views. Pausing and continuing one preview does not create a new view every time.

[Use the CSV export control. Show the downloaded file.]

I can export these numbers as a CSV file and open it in a spreadsheet.

If there is no activity in a selected period, the page shows that honestly. It does not create sample activity to fill the chart.

## 16. Workspace - name, description, and access

[Open Workspace. Set the name to Naman's demo workspace and enter a short description. Save.]

Workspace settings describe this installation. I can change the name and description, and the sidebar reflects the name.

The pages under Admin tools are available to everyone using this installation. There is no separate admin role.

This does not give anyone access to my AWS Console. AWS infrastructure permissions are separate from the buttons inside Relay.

Each Chrome profile has its own local workspace. This version does not offer a shared online team workspace.

## 17. Relay Tools - storage, metadata export, and product information

[Open Relay Tools. Click Check browser storage.]

This page helps me understand where the data lives. The storage number is a browser estimate, not the free space of my entire computer and not my AWS bill.

[Click Export workspace metadata. Show the downloaded JSON file.]

This export contains workspace information such as names, tags, playlists, agendas, and local activity.

It does not include the video files. It is also not a full backup that I can import to restore everything. For videos, I use Download or Cloud backups.

[Show About Relay.]

The About section shows the version and recording limits. There is no fixed local recording time limit, but available memory and storage still matter.

## 18. Confirmed deletion and cleanup

### Delete one local recording

[Open Library. On Demo sample A, click Delete, then Keep.]

The first click does not immediately delete the recording. I can choose Keep if I clicked by mistake.

[Click Delete again and confirm deletion of Demo sample A only.]

Now I have confirmed the deletion. This removes the local copy. An existing AWS backup would stay until I delete it separately.

If that local video was in a playlist, its playlist reference is removed. If a meeting used it, the meeting agenda stays but its recording link is cleared.

### Delete selected local recordings

[Open Manage. Search for Demo sample so only disposable clips are visible. Select Demo sample B. Show Select / clear visible, then select only disposable clips.]

Manage supports selecting several recordings. The selection control applies to the visible results.

[Click Delete selected. Read the confirmation and confirm only if every selected item is disposable.]

Bulk deletion also asks for confirmation. Important recordings should be downloaded or backed up first.

[Clear the search and show that Relay product demo remains.]

The main demo recording is still available.

## 19. Explain the technology in simple words

[Keep Relay visible or open the architecture section in the reasoning document.]

I used React to build the interface. React lets me divide the screens into reusable parts.

TypeScript helps catch many coding mistakes before the app runs. Vite prepares the files for the Chrome extension.

The browser provides screen and device capture. MediaRecorder turns those streams into a video file.

When the camera is enabled, a canvas combines the screen and face into one picture. You can think of it as a drawing surface that keeps updating.

IndexedDB is the database inside the browser that stores the finished videos. localStorage holds smaller settings and workspace information.

For cloud backup, Amazon S3 stores the selected video. Cognito provides temporary guest credentials, and IAM limits access to that guest's folder. CloudFormation describes and creates the AWS resources in code.

I did not add a separate application server or database for cloud video metadata. The basic recording details stay with the S3 object. This keeps the backup flow simpler.

## 20. Thought process, challenges, AI use, and testing

My approach was to make the full recording journey work first. Then I added organization and an optional cloud copy.

One challenge was putting the camera in the actual saved video. Showing a camera preview on the screen alone would not solve that.

Another challenge was handling permission requests and cleaning up the camera, microphone, and screen streams when recording ends or fails.

A third challenge was cloud access. A working interface is not enough. AWS must reject a guest who tries to access another guest's files.

I used AI tools to help write and refactor code, create tests, investigate errors, and prepare documentation. I checked the output instead of assuming every generated suggestion was correct.

The project passed fifty-two frontend tests and six backend tests. The production build passed too.

Live AWS tests checked multipart upload, exact video bytes after restore, and denied access across guest folders. Chrome checks used a real video made from synthetic test content and ran against the development and production builds.

Real microphone, camera, and screen-picker checks are separate. I describe only the hardware checks I have personally completed.

I explored AI captions earlier, but the account rejected the transcription and translation requests. Captions were removed. AWS is now working for backups, while AI helped the development process. I do not claim a working AI caption feature.

## 21. Limits, next improvements, and handoff

This version has local recording, organization, and optional AWS backup. It is not a complete Loom replacement.

It does not yet have public sharing links, team synchronization, video trimming, or captions.

Long recordings still depend on available memory and storage. Cloud backup has a one-gigabyte-per-video app limit, and AWS use can consume credits.

For the next version, I would first save recording chunks during capture and add recovery. Then I would add stronger account recovery, enforced cloud quotas, and controlled sharing. Wider public use also needs abuse controls and cost monitoring.

[Show GitHub, the extension ZIP, and the reasoning PDF.]

My submission includes the working source code, the extension ZIP, the reasoning document, and this product demo video.

The documentation explains setup, design decisions, challenges, tests, AI use, and the current limits.

Thank you for watching. I am happy to explain any part in more detail.

## Additional flows - show these when asked, or as a separate short recording

### A. Cancel screen selection

[From studio setup, click Choose screen & record, then cancel Chrome's source picker.]

I can cancel before sharing. No new recording should be saved. I can choose a source again when I am ready.

### B. Microphone or camera permission is denied

[Explain this unless you have rehearsed changing permissions in a separate test profile. Do not disrupt the devices recording your presentation.]

If Chrome blocks a device, I check the permission setting and try the microphone check or Connect camera again. I can also turn that device off and record without it.

A camera or microphone permission error should not make a silent screen-only recording impossible.

### C. Stop from Chrome instead of Relay

[Make a disposable recording and use Chrome's Stop sharing control. Wait for Relay to finish processing.]

The user can also stop sharing through Chrome. Relay should finish the clip and return to review. I check the saved result before continuing.

### D. Cancel a cloud transfer

[Use a disposable clip large enough for progress to remain visible. Click Back up, then Cancel transfer. Refresh afterward. Do not repeat this with important files.]

I can cancel a transfer. Because a request might finish just before cancellation, I refresh the cloud list to see the final result. My local video is still available.

### E. Offline or cloud access failure

[Explain verbally, or test in a separate rehearsal with the network offline.]

Local recording and saved local videos do not require AWS. If a cloud request fails, Relay shows an error. I keep the local file, check the connection, and retry. I do not say a backup succeeded unless the success message appears.

### F. Local save failure

[Explain verbally. Do not fill the disk or clear browser data to create this error during the demo.]

If local saving fails, the recording preview and download remain important. I download the clip before closing the page. When starting again would discard an unsaved clip, Relay asks for confirmation.

### G. Empty results and first use

[Search for a title that does not exist, then clear the filter.]

An empty result is different from losing my recordings. I can clear the filters and see the library again. A fresh installation starts with empty data, not the demonstration videos shown in documentation screenshots.

## Coverage checklist

| Tab or flow | Script section |
| --- | --- |
| Recording studio, devices, floating camera, source selection, pause/resume, finish | 2-3 |
| Preview, rename, download, New recording | 4 |
| Library, search, sorting, favorites, folder filters | 5-6 |
| Manage, details, tags, selection and bulk deletion | 6, 18 |
| Cloud connect, upload, refresh, update, restore, replacement confirmation, deletion | 7-8 |
| For you | 9 |
| Playlists: create, add, reorder, play, rename, remove, delete | 10 |
| Meetings: create, edit/cancel, link/play, calendar export, delete, studio shortcut | 11 |
| Recent: created and played | 12 |
| Personal settings and persistence | 13 |
| Overview and navigation shortcuts | 14 |
| Insights, dates, charts, CSV export | 15 |
| Workspace name, description, and access | 16 |
| Relay Tools, storage estimate, metadata export, About | 17 |
| Local/cloud separation and deletion consequences | 8, 18 |
| Technology, approach, challenges, AI use, testing, limits, deliverables | 19-21 |
| Cancellation, denied permissions, offline, save failure, empty states | Additional flows A-G |

## If the reviewer requests a shorter video

The full script covers all flows. For a five-to-seven-minute summary, demonstrate recording, preview/download, one organization action, and a real AWS upload/restore. Briefly show the remaining tabs, then explain AI use, one challenge, and the limits. Label that video a summary; it does not demonstrate every action above.
