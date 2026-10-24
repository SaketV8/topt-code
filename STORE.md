# Store metadata

Material every store asks for at submission time. Keep it current as the
code changes instead of rewriting it at the end. Replace the lines marked
TODO before you submit, and set the Privacy policy URL under Listing to
your own address once you host a policy.

Last updated: 2026-10-24

## Listing

- Name: Topt Code
- Summary: A tiny TOTP authenticator in your browser toolbar.
- Description: TODO write two or three short paragraphs of user benefits.
  Suggested points: add an account with a base32 secret or an otpauth://
  link; see the current and next one-time codes with a live countdown;
  copy a code in one click; edit, delete, or hide your codes. Be upfront
  that it stores secrets locally and unencrypted, and is meant for
  low-stakes accounts — not a replacement for a dedicated authenticator
  app.
- Category: TODO pick one per store (for example Productivity).
- Screenshots: TODO at least one 1280x800 screenshot per store.

## Security note (show this to users)

Topt Code stores TOTP secrets unencrypted in the browser's local storage
and has no master password. It is a convenience tool for low-stakes codes.
For important accounts, use a dedicated authenticator app on a separate
device (for example Proton Authenticator). Keeping codes in the same
browser you sign in from undermines the point of a second factor.

## Privacy and data use

- Collected: nothing. The extension sends no user data to any server, has
  no account or sign-in, and runs no analytics.
- storage: stores the accounts you add (title, issuer, and the TOTP
  secret) in the browser's local storage so they persist between sessions.
  This data stays on the device and is never transmitted. It is not
  encrypted by the extension.
- Host access: none. The extension requests no host permissions and runs
  no content scripts; it operates only inside its own toolbar popup and
  never reads the pages you visit.
- Not collected: browsing history, page content, activity on websites,
  sign-in or account data for third-party sites, messages the user writes,
  location, search terms, bookmarks, payment details, health information,
  personal files, and usage analytics. Nothing leaves the browser.
- Firefox data collection declaration: the manifest declares
  data_collection_permissions required: none, which matches the lines
  above. If you add data collection, update the declaration, this section,
  and your privacy policy in the same change.

## Chrome Web Store

### Single purpose

Generates time-based one-time passcodes (TOTP) for accounts the user adds,
and shows them in the toolbar popup.

### Permissions justification

- storage: Saves the user's accounts and their TOTP secrets locally so
  codes can be generated and the list persists between browser sessions.
  No other permissions are requested — no host access, no tabs, no network.

## Firefox Add-ons

### Reviewer notes

To exercise the extension: open the toolbar popup, click +, and add an
account. You can use the RFC 6238 test secret
`GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ` (any title/issuer) to see a code appear
with a live countdown. No sign-in or credentials are required.

The build is bundled, so AMO requires a source zip. Build from source
with: `pnpm install`, then `pnpm run build:firefox`. The `dist/` output
matches the upload.

### Release notes

TODO user-facing notes for the version you are submitting.

## Edge Add-ons

### Certification notes

Same as the Firefox reviewer notes above: add an account in the popup
(optionally with the RFC 6238 test secret) to see a generated code. No
sign-in, no host permissions, no network access.

## Version history

- 1.0.0 (unreleased): initial TOTP authenticator — add accounts (manual or
  via otpauth:// URI), current and next code, countdown bar, copy, show or
  hide, edit, and delete. Not yet submitted to any store.
