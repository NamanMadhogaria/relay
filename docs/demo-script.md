# Relay demo script

This script uses short sentences and simple English. Read slowly and pause while clicking. The full demo takes about 7 to 9 minutes, depending on your pace. Words in square brackets are actions for you, not words to read aloud. You do not need to mention that English is your third language.

## Before you start

- Reload Relay in Chrome and test your microphone and camera. Play the downloaded test video to check both sound and picture.
- Keep one short recording ready as a backup. Use a clean tab with no private information for screen sharing.
- Use a separate recording tool to film this demo, so you can show Relay starting and stopping its own recording. Avoid using two tools that both need the same camera if your laptop cannot support that.
- Keep the GitHub repository and README ready. Give the reviewer access if the repository is private.
- Do not read every technical detail. Show the working flow first.

## 1. Introduction

[Open Relay on Recording studio.]

Hello, my name is Naman Madhogaria.

This is Relay, my Chrome extension for screen recording.

The assignment was to build a product similar to Loom, with a simple user experience. My focus was the main journey: record a video, check the result, and organize it.

Relay can record a screen, a window, or a browser tab. You can also add your voice and camera.

Recording works locally. You can also back up videos to AWS without creating a Relay account.

## 2. Record a video

[Show the microphone and camera options. Enable them and complete any permission checks.]

This is the Recording studio. I can check my microphone before I start. This helps me avoid making a video with no voice.

The camera is optional. When I turn it on, my face appears in a circular preview.

[Click Choose screen & record. Choose your clean demo tab.]

Chrome asks me what I want to share. I choose the source myself.

[Wait for the countdown. Record about ten seconds.]

This is a short test recording. I am sharing my screen, and I am also recording my voice and camera.

[Show pause, then resume, then finish.]

I can pause when I need a break. Then I can continue the same recording.

Now I will finish and check the result.

## 3. Review and save

[Play a few seconds of the preview. Pause before speaking again.]

Here is the recorded video. The camera is part of the saved video, so it also appears in the downloaded file.

[Rename the video to Relay product demo. Show Download.]

I can give the video a clear name and download a copy. The download uses the WebM video format.

The video is also saved in this browser's local storage. It uploads to AWS only when I choose Back up on the Cloud backups page.

[Click New recording.]

New recording takes me back to the setup screen. My saved video stays in the library.

## 4. Find and organize videos

[Open Library. Search for Relay product demo, then favorite it.]

Library shows my saved recordings. I can search, sort, play, download, or delete a video.

[Open For you, then Recent.]

For you gives me quick access to favorites and new recordings. Recent helps me find videos I created or played recently.

[Open Manage. Add the folder Demo and the tag project to the recording.]

Manage helps me organize the library. I can change titles, folders, and tags. I can also select several videos for deletion. Deletion asks for confirmation.

[Open Playlists. Create Product walkthrough and add the video.]

A playlist puts related videos in one place. For example, I could group training videos or project updates. I can change their order without making extra copies of the video files.

## 5. Meetings and settings

[Open Meetings. Create an agenda called Project review and link the recording.]

Meetings is a simple planning page. I can write an agenda, choose a date and time, and link a saved recording.

I can export a calendar file. This page does not join meetings or send invitations automatically.

[Open Personal settings. Switch to dark mode.]

In Personal settings, I can change my display name and choose light or dark mode. Relay remembers these choices.

## 6. Workspace tools

[Open Overview, then Insights.]

Overview shows totals for this local workspace, such as recordings and storage.

Insights shows recording and playback activity. These numbers come from local use. They are not public views or unique viewers. I can filter the dates and export the data as a CSV file.

[Open Workspace. Show its name and description.]

Workspace lets me change the workspace name and description.

All these management pages are open to anyone using this installation. There is no separate admin role. Each Chrome profile has its own local workspace.

[Open Relay Tools.]

Relay Tools shows storage information and lets me export workspace details. This export contains information like names and organization. It does not contain the actual videos, so I download important videos separately.

## 7. AWS cloud backup

[Open Cloud backups. Click Connect to AWS, then Back up beside the demo recording. Wait until upload finishes.]

This is the AWS integration. Amazon S3 stores a separate copy of my video in Mumbai. I choose which videos to upload.

Amazon Cognito gives this installation temporary access. The app does not contain my AWS password or permanent access keys. AWS permissions limit each guest to their own folder.

[Show the video under In AWS. Show Restore to Library.]

Restore to Library downloads the cloud video and saves it on this device. Deleting a cloud copy does not delete the local video.

There is no Relay login. I must keep this Chrome profile and extension data to keep access to this cloud space. It is not a shared team account or automatic recovery on a new device.

## 8. How it works

[Open the README or keep Relay visible.]

I used React to build the screens and buttons. I used TypeScript to catch many coding mistakes before running the app. Vite prepares the code for the Chrome extension.

The browser provides the tools for screen, microphone, and camera capture. MediaRecorder turns the captured media into a video file.

When the camera is enabled, a canvas combines the screen and camera into one picture. You can think of the canvas as a drawing surface that updates continuously.

The finished video goes into IndexedDB. This is a database inside the browser. Smaller details, like the theme and tags, use localStorage.

The recording runs in a full browser tab. This means closing the small extension launcher does not end the recording.

## 9. AI use, challenges, and testing

I used AI tools during development to help write code, improve the structure, create tests, and prepare documentation.

I checked the generated work with automated tests, build checks, and browser checks. AI suggestions still needed review.

One challenge was adding the camera to the actual video, instead of showing it only on the page.

Another challenge was handling permissions and stopping capture safely. For example, a user may cancel screen sharing or deny microphone access.

I also explored AWS for AI captions. The upload flow worked in the prototype, but the account rejected the transcription and translation requests. Captions were later removed from the scope.

This release uses AWS for video backup and restore. It does not generate captions. The AI contribution is the development workflow.

The project passed 52 frontend tests and six backend tests. The production build also passed. Browser checks used test media. Real camera and microphone checks are listed separately in the testing document.

## 10. Scale, limits, and closing

I separated the interface, recording logic, camera processing, and storage into different parts. This makes the code easier to maintain and extend.

The current product has local recording and working AWS backup. It is not a shared team workspace. I tested real uploads, restored video bytes, and checked that a guest cannot access another guest's files.

There is no fixed recording time limit, but long recordings still depend on available memory and storage.

For a future version, I would save small parts of a recording as it runs. This would reduce memory pressure and help with recovery. I would also consider optional cloud sharing and reliable AI captions.

My submission includes the code, a ready-to-load extension, setup instructions, my approach, key challenges, and testing notes.

Thank you for watching. I am happy to explain any part of the project.

## Short answers for follow-up questions

**Is it better than Loom?**

My focus is a simple local recording flow, with no sign-in and clear privacy. I would not claim it replaces all of Loom's features. It does not yet offer cloud sharing or team collaboration.

**How did you meet the AI objective?**

I used AI in the development and testing workflow, and I documented how I checked the results. I also explored AI captions. The final version does not include a working AI feature for users, so that part of the product objective is still a gap.

**What does AWS do in this project?**

Amazon S3 stores selected video backups. Amazon Cognito provides temporary guest credentials. IAM controls each guest's access. CloudFormation creates the infrastructure. The earlier caption service is separate and is not used.

**Where are my videos?**

They are in IndexedDB in the Chrome profile where Relay is installed. Downloaded copies are normal files on the computer. Selected backups also live in S3. Clearing browser data can remove the local library and the guest identifier needed for in-app cloud access.

**Can many people use it?**

People can install it and use their own local workspaces. They do not share one online workspace. Each installation also has its own AWS backup space. A team version would need accounts, collaboration permissions, abuse controls, and more testing.

**What would you improve first?**

I would improve long-recording reliability by saving chunks during capture and adding recovery. Then I would add sharing and test an optional AI feature with real mixed-language recordings.

**Did you test it on real hardware?**

Describe only the checks you personally completed. For example, after actually checking: I recorded a short clip on my laptop and checked the screen, voice, and camera in the preview and download. Do not say this until you have done it.

## If you have only five minutes

Keep the recording and preview demonstration. Show Library, one playlist, dark mode, and Insights. Briefly mention the other pages instead of clicking each one. Finish with the AI workflow, one technical challenge, the local-recording and optional-cloud scope, and the deliverables.
