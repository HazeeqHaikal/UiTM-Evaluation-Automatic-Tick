# Changelog

## 3.0.0

Rewritten around a background service worker. The visible change is progress
and a stop button; the important change is that it no longer submits surveys it
has not verified.

### Fixed

- **"Highest" answers could be the lowest.** v2 clicked every radio button in
  turn and let the last one in the DOM win, so exit surveys and SuFO got the
  correct answer only when the options happened to render low-to-high. Options
  are now grouped per question and chosen by value.
- **Questions with non-numeric options were skipped.** v2 ran `parseInt` over
  the option value and gave up on `NaN`, leaving yes/no questions blank — and
  then submitted the form anyway. Those groups now fall back to position.
- **Nothing checked the form before submitting.** Every question is re-read from
  the live DOM after filling; a survey that is not completely answered is
  reported instead of submitted.
- **Three separate pieces of code raced to navigate.** The popup's post-submit
  timer, the content script's survey handler and its dashboard handler each
  moved the tab, alongside the site's own redirect. The service worker is now
  the only thing that navigates.
- **A finished survey could repeat forever.** Queue removal compared URLs with
  `includes()`, so a trailing slash meant the survey was never removed. URLs are
  normalised, attempts are capped, and a watchdog recovers a stuck page.
- **Failures disappeared.** v2 dropped a survey from the queue before filling it,
  so anything that went wrong vanished silently. Failures are retried once, then
  recorded and reported.
- **The scanner only understood English.** It required the link text to contain
  "answer", so a Malay interface reported "no incomplete surveys found" and did
  nothing. Matching is now on the link target.

### Added

- Live progress, an activity log, and a stop button that actually stops.
- SuFO and KIFO support, including listing pages that link to individual surveys.
- Preview mode: reports what would be selected without touching the page.
- Answer strategies: realistic, always highest, always lowest, neutral.
- Manual submit mode: fill the page and leave the submit to you.
- Dropdown questions are answered; required comment boxes are reported as
  blocking rather than filled with invented text.
- Confirmation modals after submitting are handled.
- Settings page, and an optional update check against GitHub releases for
  unpacked installs. The GitHub origin is an **optional** host permission that
  is off by default and requested at runtime, so upgrading to 3.0 does not
  raise a permission warning — which would otherwise have made Chrome disable
  the extension for every existing user until they re-approved it, in exchange
  for a feature that only helps installs the store does not update anyway.
- 26 unit tests over the answer-selection and scanning logic, and CI.

### Changed

- Popup rebuilt without Tailwind. Roughly 290 lines of CSS, light and dark.
- Run state moved from `sessionStorage` to `chrome.storage.session`, so the
  popup can show progress after being closed and reopened.
- New permissions: `storage` and `alarms`, both warning-free. No new *required*
  host permissions, so the update installs silently.

## 2.0

- UI redesign with Tailwind CSS, dashboard automation, stricter CSP.

## 1.2

- Basic auto-fill, Bootstrap UI, manual filling only.
