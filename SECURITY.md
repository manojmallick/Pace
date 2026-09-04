# Security and privacy

## The short version

Pace has no server, no account system, no database, and makes no network
requests. Everything a user enters stays in `localStorage` in their own browser,
on their own device. There is no transmission to secure and no stored data to
breach, because there is no remote anything.

This is enforced structurally, not promised. `test/pace-ui.test.js` asserts the
page contains no absolute `http` URLs, and CI fails the build if the project
acquires a dependency.

## Threat model

Being explicit about what this design does and does not protect against.

**Protected against, by construction**

- Server breach — there is no server
- Data interception — nothing is transmitted
- Third-party tracking — no analytics, no CDN, no external fonts
- Account compromise — there are no accounts and no credentials
- Supply-chain attack — no dependencies ship with the app

**Explicitly not protected against**

- **Anyone with access to the device or browser profile.** The log is readable
  by anything running in that browser. There is no passcode or encryption.
  Anyone who can unlock the phone can read the entries.
- **Shared or public computers.** Use the "Erase all my data from this device"
  button, or don't use Pace on a shared machine.
- **Browser extensions**, which can read page storage.
- **Device backups**, which may include `localStorage` and may be cloud-synced
  outside the user's awareness.

The privacy model is "this data never travels", not "this data is encrypted at
rest". A user with a specific reason to hide their recovery from someone who
shares their device needs more than Pace offers.

## Health data and regulation

Pace stores health-related information. It is a hackathon prototype and has not
been assessed against HIPAA, GDPR, or any medical device regulation.

In its current form it stores no data on any system the author controls and
transmits nothing, which is why it can be used without those questions being
answered. **Any future change that adds sync, export-to-server, accounts, or
analytics changes that completely** and must not be made without addressing
regulatory obligations first. Treat that as a hard gate, not a to-do.

## Reporting a vulnerability

Open a GitHub issue for anything that does not itself expose user data. For a
finding that would, contact the maintainer directly rather than filing publicly.

Findings in scope include: a way to make the app transmit data anywhere, stored
state that can drive the app into an unsafe condition, and — treated as a
security-class bug, not merely a functional one — **any way to advance a stage
without meeting the symptom-free requirement.** The gate is the product's safety
claim. Breaking it is the most serious bug this project can have.
