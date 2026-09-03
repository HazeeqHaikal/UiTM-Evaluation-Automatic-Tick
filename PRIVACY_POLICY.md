# Privacy Policy for UiTM Evaluation Auto-Fill Extension

**Last Updated: September 3, 2026 — applies to version 3.0.0**

## Overview
UiTM Evaluation Auto-Fill Extension ("the Extension") is committed to protecting your privacy. This privacy policy explains how the Extension handles user data.

## Data Collection
**The Extension does NOT collect, store, or transmit any personal data.**

Specifically:
- ❌ We do NOT collect personal information
- ❌ We do NOT track your browsing activity
- ❌ We do NOT use analytics, advertising or tracking tools
- ❌ We do NOT set cookies
- ❌ We do NOT send your data anywhere, and we run no server of our own

Two things the Extension *does* keep or send, described in full below, so that
the list above is not read as more than it says:

- It **saves your settings** and the queue for the run in progress in your own
  browser. See [What Is Stored, and Where](#what-is-stored-and-where).
- **Only if you switch on the optional update check**, it asks GitHub for the
  latest version number once a day. This is off by default and requires your
  approval at a Chrome prompt. It carries nothing about you beyond the IP
  address and user-agent that any web request reveals. See
  [Third-Party Services](#third-party-services).

## Permissions Used

### 1. **Scripting Permission**
- **Purpose:** To place the auto-fill script into a ufuture.uitm.edu.my tab that was already open before the Extension was loaded or updated
- **Scope:** ufuture.uitm.edu.my only. The script itself does nothing until you press Start; it loads on those pages so that it is ready to report progress during a run
- **Data:** No data is collected or stored

### 2. **Active Tab Permission**
- **Purpose:** To access the current tab and detect if you're on a UiTM survey page
- **Scope:** Only the active tab, and only on ufuture.uitm.edu.my domain
- **Data:** No data is collected or stored

### 3. **Host Permissions (ufuture.uitm.edu.my)**
- **Purpose:** To interact with UiTM survey pages for auto-filling forms
- **Scope:** Limited to ufuture.uitm.edu.my domain only
- **Data:** No data is collected or stored

### 4. **Storage Permission**
- **Purpose:** To remember your settings, and to hold the list of surveys for the run in progress
- **Scope:** Your own browser. Settings use Chrome's own sync, so they follow your Chrome profile if you have sync enabled
- **Data:** Your chosen answer strategy and toggles, plus survey URLs on ufuture.uitm.edu.my for the duration of a run. No answers, grades, names or identifiers

### 5. **Alarms Permission**
- **Purpose:** A timeout that recovers a stuck page, and a once-a-day update check
- **Scope:** Local scheduling only
- **Data:** None

### 6. **Optional Host Permission (api.github.com/repos/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick)**
- **Optional, and off by default.** The Extension does not hold this permission unless you switch on "Check GitHub for new versions" in Settings and approve Chrome's prompt. Until then no request is ever made
- **Purpose:** To read the version number of the latest public release, so people running an unpacked copy are told when it is out of date
- **Scope:** One unauthenticated `GET` for the public releases endpoint of this repository, at most once a day
- **Data sent:** Nothing beyond what any HTTP request necessarily includes (your IP address and browser user-agent, seen by GitHub). No identifiers, no page content, no survey data, no extension usage
- **Withdraw it:** Switch the setting off, or remove the site access at `chrome://extensions/`. Either stops the check immediately. Chrome Web Store installs update themselves regardless, so switching it off costs you nothing

## What Is Stored, and Where

| What | Where | Cleared when |
|---|---|---|
| Your settings (answer strategy, auto-submit, preview, update check) | `chrome.storage.sync` | You uninstall the extension |
| The queue for the run in progress: survey URLs on ufuture.uitm.edu.my, progress counters, and the activity log shown in the popup | `chrome.storage.session` | The run finishes, or you close the browser |
| The latest release number seen on GitHub | `chrome.storage.local` | You uninstall the extension |

All three stay on your device. None of them is sent anywhere.

**The Extension never stores your survey answers, your student details, your
grades, or anything identifying you.**

## How the Extension Works
1. You open the UiTM dashboard, a SuFO/KIFO listing, or a single survey, and press Start
2. The extension scans the page locally for survey links
3. It navigates to each survey, fills the form, and re-reads the page to confirm every question is answered before submitting
4. All form processing happens locally on your computer
5. No survey data, and nothing about you, leaves your browser

## Third-Party Services

The Extension has no analytics, no tracking, and no advertising, and it sends
your data to nobody.

Out of the box it makes no external request at all.

One is possible, and only if you switch on the optional update check and approve
Chrome's permission prompt: an unauthenticated `GET` to GitHub's public releases
endpoint for this repository, at most once a day, to read a version number.
GitHub sees that request the way it sees any visitor — your IP address and
user-agent. It carries no identifier, no page content and nothing about your
surveys. Switching the setting off, or removing the site access at
`chrome://extensions/`, stops it.

## Data Security
There is no account, no server and no transmission of your data, so there is no
copy of it anywhere for anyone to breach. What the Extension saves — your
settings and the queue for the current run — lives in your browser's own
extension storage, protected by your browser and your operating system like any
other browser data. All form-filling happens locally on your computer.

## Changes to This Policy
If we ever change our privacy practices, we will update this policy and notify users through the extension update notes.

## Your Rights
You have complete control over the extension:
- You can uninstall it at any time from chrome://extensions/
- You can view the source code on GitHub: https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick
- You can review all permissions in the Chrome extension settings

## Contact
If you have questions about this privacy policy or the extension's data practices:
- Chrome Web Store: https://chromewebstore.google.com/detail/uitm-evaluation-automatic/pdfamomgbaoabjjhjldppbnjnoigemgl
- GitHub Issues: https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick/issues
- Source Code: https://github.com/HazeeqHaikal/UiTM-Evaluation-Automatic-Tick

## Compliance
This extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR)
- Chrome Extension Data Usage Requirements

## Summary
**This extension does not collect, store, or transmit any of your personal
data.** By default it contacts nothing at all. The only request it can ever make
is an anonymous one to GitHub asking what the newest version number is, and that
is off until you turn it on and approve it.

---

**Developer:** UNIVERSE
**Version:** 3.0.0
**Last Updated:** September 3, 2026
