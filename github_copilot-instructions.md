# GitHub Copilot — Access & Setup for this repository

Purpose
This document explains how to grant GitHub Copilot access to this repository (journey247/whistle-inn) and how to verify it works. It provides short, actionable steps for personal accounts and organizations, plus troubleshooting tips.

Prerequisites
- You must be the repository owner (for personal repos) or an organization owner/admin (for org repos).
- The user(s) who will use Copilot must have an active Copilot subscription (Individual) or an assigned seat (Copilot for Business).
- If your organization uses SAML single sign-on (SSO), the GitHub App must be authorized for the org (org-owner step).

NOTE: This repository is under a personal account. The “Organization” section is included for future reference.

If this is a personal repository (quick steps)
1. Enable Copilot on your GitHub account:
   - Visit https://github.com/settings/copilot and turn GitHub Copilot on for your account.
2. Install the Copilot extension for your editor:
   - VS Code: install “GitHub Copilot” from the Extensions view and sign in when prompted.
   - JetBrains/other editors: install the matching Copilot plugin and sign in.
3. Verify:
   - Open a file in journey247/whistle-inn with your editor and check that Copilot suggestions appear.
   - Alternatively, revisit https://github.com/settings/copilot to confirm Copilot is active for your account.

If this is an organization repository (org-owner steps)
(Only needed if the repo is later moved to an org or you're managing other org repos.)
1. Install GitHub Copilot (GitHub App) from the Marketplace:
   - Go to https://github.com/marketplace/github-copilot and click Install.
   - Choose the organization and continue the install flow.
2. Choose repository access:
   - Select “Only select repositories” (least privilege) or “All repositories”.
   - If selective, explicitly select journey247/whistle-inn.
3. Authorize SAML SSO (if enabled):
   - Organization settings → Security → SAML single sign-on → Authorize OAuth Apps and GitHub Apps; authorize the Copilot app.
4. Assign seats (Copilot for Business):
   - Purchase seats and assign to users in the organization admin/Copilot admin UI.
5. Verify:
   - Confirm the app appears in Organization settings → Installed GitHub Apps or in the repo’s Settings → Installed GitHub Apps.
   - Have a user with a seat sign into the Copilot editor extension and open files to confirm suggestions appear.

How to verify Copilot can access this repo
- For personal repos: the user with Copilot enabled can open files and receive suggestions.
- For private repositories in an org: confirm the Copilot GitHub App is installed on journey247/whistle-inn.
- Check: Repo Settings → Installed GitHub Apps (Copilot should be listed).
- Check user license: the user has an active Copilot subscription or an assigned seat.
- If the editor outputs permission errors, sign out and sign back into the Copilot extension and accept any authorization prompts.

Troubleshooting checklist (common issues & fixes)
- No suggestions in editor:
  - Ensure the user is signed into the Copilot extension with the account that has Copilot enabled.
  - Ensure the file type/language is supported (TypeScript, JavaScript, etc.).
- Private repo but no access:
  - Confirm the Copilot app is installed on this repo or that the user’s account has access.
- Organization blocks app installs:
  - An org owner must allow the GitHub Copilot app or adjust third-party app restrictions.
- SAML SSO prevented access:
  - Org owner must authorize the Copilot app for SAML SSO in org security settings.
- Billing / seats:
  - For Copilot for Business, confirm seats were purchased and assigned to intended users.

How to add this file to the repository (two quick ways)
- GitHub web (recommended for single changes):
  1. Go to the repo: https://github.com/journey247/whistle-inn
  2. Click Add file → Create new file
  3. For filename enter: .github/copilot-instructions.md
  4. Paste this content and commit to main (or create a branch and open a PR).
- Git CLI:
  1. git checkout -b add/copilot-instructions
  2. mkdir -p .github
  3. Create .github/copilot-instructions.md and paste this content
  4. git add .github/copilot-instructions.md
  5. git commit -m "Add Copilot access instructions"
  6. git push origin add/copilot-instructions and open a PR on GitHub

Useful official links
- Personal Copilot settings: https://github.com/settings/copilot
- GitHub Copilot (Marketplace): https://github.com/marketplace/github-copilot
- Set up Copilot for an organization: https://docs.github.com/en/copilot/getting-started-with-github-copilot/setting-up-github-copilot-for-your-organization
- Manage Copilot for an organization: https://docs.github.com/en/copilot/getting-started-with-github-copilot/managing-github-copilot-for-your-organization
- Installing GitHub Apps: https://docs.github.com/en/apps/using-github-apps/about-installing-github-apps
- Authorize GitHub Apps / OAuth for SAML SSO: https://docs.github.com/en/organizations/managing-access-to-your-organizations-resources/authorizing-oauth-apps-and-github-apps-for-your-organization

If you want me to also commit this and open a pull request, tell me and I’ll proceed.