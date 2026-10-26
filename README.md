# My Magical Planner 🎀

A responsive, pink magical planner web app with editable tasks, weekly planning, habit tracking, journaling, routines, a focus timer, and calendar.

## Run locally
Open `index.html` in a modern browser. Core features work, but PWA installation and offline caching require a secure hosted site (`https://` or localhost), not a `file://` URL.

## Publish free with GitHub Pages
1. Sign in to GitHub and create a new **public** repository (for example, `magical-planner`).
2. Upload all files from this folder to the repository root.
3. Open **Settings → Pages**.
4. Under build/deployment, choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
5. Wait for the published URL shown in Pages settings.
6. Open that URL in Chrome on your Android tablet. Use Chrome's menu and choose **Install app** or **Add to Home screen**.

## Saving data
Planner entries are saved in this browser's local storage on this device. They do not automatically sync between browsers or devices. Avoid clearing site data unless you have made a backup. The app currently includes local persistence; use your browser's site-data backup options or export feature if added in a later version before switching devices.

## Notes
- The service worker caches the core app files for offline access after the first successful visit.
- Google Fonts are optional visual enhancements; the app uses fallback fonts if they are unavailable.
- No account or external API is required.
