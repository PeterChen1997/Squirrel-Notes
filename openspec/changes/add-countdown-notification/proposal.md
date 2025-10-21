## Why
Currently, when users submit learning content on the homepage, they are redirected to a progress page and must wait for AI analysis to complete before they can add more content. This creates a friction point for users who want to quickly add multiple notes in succession, reducing the app's usability for batch content input scenarios.

## What Changes
- Add a countdown notification system that appears in the top-right corner after content submission
- Keep users on the homepage instead of redirecting to progress page
- Notification shows countdown timer (5 seconds) and allows clicking to view detailed progress
- Users can continue submitting new content while previous items are being processed
- Queue multiple content submissions for background AI analysis
- Add visual indicators for processing status

## Impact
- Affected specs: UI/UX, Homepage Interaction Flow, Content Processing
- Affected code: Homepage route, progress handling, notification system
- **BREAKING**: Changes the current redirect-to-progress flow to a non-blocking notification system