# UiTM Evaluation Auto-Fill

**Version 3.0** — verified answers, live progress, preview mode

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-blue?logo=googlechrome)](https://chromewebstore.google.com/detail/uitm-evaluation-automatic/pdfamomgbaoabjjhjldppbnjnoigemgl)
[![CI](https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick/actions/workflows/ci.yml/badge.svg)](https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/Version-3.0-green)](https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick/releases)

Browser extension that fills UiTM **SuFO**, **KIFO**, **Entrance** and **Exit**
surveys on `ufuture.uitm.edu.my`.

Sambungan pelayar yang mengisi soalan **SuFO**, **KIFO**, **Entrance Survey**
dan **Exit Survey** UiTM.

---

## Install

**[→ Chrome Web Store](https://chromewebstore.google.com/detail/uitm-evaluation-automatic/pdfamomgbaoabjjhjldppbnjnoigemgl)** — installs and updates itself. Works on
Chrome, Edge and Brave.

<details>
<summary>From source (developers)</summary>

```bash
git clone https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick.git
cd UiTM-Evaluation-Automatic-Tick
npm install && npm test
```

Then open `chrome://extensions/`, turn on **Developer mode**, click **Load
unpacked** and select the folder. Unpacked installs do not auto-update; the
extension will tell you when a newer release is tagged on GitHub.
</details>

---

## Using it

1. Open the **dashboard** (or a SuFO/KIFO listing page) and click **Start** —
   the extension finds every incomplete survey, answers each one, submits it,
   and returns you to the dashboard when it is done. The popup shows which
   survey it is on and how many remain; **Stop** halts it immediately.
2. Or open a **single survey** and click **Start** to do just that one.

Tick **Preview** first if you want to see what it would answer without
submitting anything.

### Answer strategies

| Strategy | What it does |
|---|---|
| **Realistic** (default) | Entrance & KIFO get the lowest option, Exit & SuFO the highest — the shape a real semester produces. |
| Always highest | Top of the scale everywhere. |
| Always lowest | Bottom of the scale everywhere. |
| Neutral | Middle of the scale everywhere. |

Options are ranked by their value when that value looks like a Likert scale, and
by their order on the page otherwise — so a survey that renders its options
high-to-low still gets the answer you asked for.

### What it will not do

- **It will not submit an incomplete survey.** Every question is re-read after
  filling. If something is unanswered the run stops and names it.
- **It will not write comments for you.** Optional free-text boxes are left
  blank. A *required* one is reported as blocking so you can write it yourself.

---

## How it works

```
popup.html / popup.js   Progress, controls, activity log. Holds no state.
options.html/js/css     Settings, stored in chrome.storage.sync.
background.js           Service worker. The only thing that navigates the tab.
content.js              Reports the page and obeys the worker. Never navigates.
src/survey-core.js      Answer selection, verification, scanning. Pure DOM logic.
src/constants.js        Shared configuration.
test/                   26 unit tests over survey-core, under jsdom.
scripts/                Version check and zip build.
```

The service worker owns a queue in `chrome.storage.session` and drives it one
step at a time: navigate → the content script announces the page → fill →
verify → submit → wait for the navigation that proves it landed. A survey that
stalls is retried once, then recorded as failed and skipped. A 45-second
watchdog covers a page that never responds.

Earlier versions had the popup, the content script and the site's own redirect
all trying to move the tab at once; which one won depended on timing.

### Permissions

| Permission | Why |
|---|---|
| `host_permissions: ufuture.uitm.edu.my` | The only site it touches. |
| `host_permissions: api.github.com/repos/...` | Reads the latest release number. Nothing is sent. |
| `scripting` | Injects the content script into tabs opened before the extension loaded. |
| `activeTab` | Reads the URL of the tab you start from. |
| `storage` | Settings, and the queue for the current run. |
| `alarms` | The watchdog and the daily update check. |

---

## Development

```bash
npm install
npm test     # unit tests
npm run lint # manifest / package.json / git tag must agree
npm run build # dist/uitm-evaluation-auto-fill-<version>.zip
```

### Releasing

Pushing a `v*` tag runs the tests and publishes to the Chrome Web Store.

```bash
# bump the version in BOTH package.json and manifest.json, then:
git commit -am "v3.0.1"
git tag v3.0.1
git push --follow-tags
```

The workflow refuses to run if the tag, `package.json` and `manifest.json`
disagree. It needs four repository secrets, created once from a Google Cloud
OAuth client with the Chrome Web Store API enabled:

| Secret | Where it comes from |
|---|---|
| `CWS_EXTENSION_ID` | The id in your Web Store item URL. |
| `CWS_CLIENT_ID` | Google Cloud → APIs & Services → Credentials → OAuth client (Desktop app). |
| `CWS_CLIENT_SECRET` | Same OAuth client. |
| `CWS_REFRESH_TOKEN` | One-time OAuth exchange for scope `https://www.googleapis.com/auth/chromewebstore`. |

Without those secrets the workflow still builds and attaches the zip to a GitHub
Release — it just skips the store upload, so forks work.

**Note on direction:** GitHub can push to the Chrome Web Store, but the Web
Store cannot push back. There is no API to read a published extension's source,
so this repository has to stay the source of truth. Anything uploaded to the
store by hand will be overwritten by the next tagged release.

---

## Troubleshooting

| Symptom | Try |
|---|---|
| Nothing happens | Check you are on `ufuture.uitm.edu.my`. The popup says so if you are not. |
| "No incomplete surveys found" | You are on a page with no survey links. Open the dashboard. |
| A survey is skipped | Open the **Activity** log in the popup — it names the survey and why. |
| It stops on one survey | The page had an unanswered question the extension could not identify. Answer that one by hand and start again. |
| Just updated and it misbehaves | Reload the extension at `chrome://extensions/`, then hard-refresh the page. |

---

## Disclaimer

This tool automates form filling. You remain responsible for the accuracy of
your responses and for following UiTM's policies. Preview mode exists so you can
check what it would submit before it does.

Alat ini mengautomasikan pengisian borang. Anda bertanggungjawab memastikan
ketepatan jawapan anda dan mematuhi dasar UiTM.

## Links

- [Chrome Web Store](https://chromewebstore.google.com/detail/uitm-evaluation-automatic/pdfamomgbaoabjjhjldppbnjnoigemgl)
- [Changelog](CHANGELOG.md)
- [Privacy Policy](PRIVACY_POLICY.md)
- [Report an issue](https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick/issues)

## License

MIT. Original author: UNIVERSE.
