# GitHub Copilot Access Setup for journey247/whistle-inn

## Purpose

This document provides step-by-step instructions for granting GitHub Copilot access to the `journey247/whistle-inn` repository. Whether you're setting up Copilot for personal use or configuring it for an organization, this guide will help you enable AI-powered code assistance for this project.

## Prerequisites

Before setting up GitHub Copilot, ensure you have:

- **Repository Permissions**: Owner or admin access to the `journey247/whistle-inn` repository
- **GitHub Copilot License**: One of the following:
  - GitHub Copilot Individual subscription ($10/month or $100/year)
  - GitHub Copilot Business license (assigned by your organization)
  - GitHub Copilot Enterprise license (for organizations with Enterprise Cloud)
- **SAML SSO**: If your organization uses SAML single sign-on, you'll need to authorize the GitHub Copilot app after installation

## Instructions for Personal Repositories

If `journey247/whistle-inn` is a personal repository (owned by an individual user):

### Step 1: Enable GitHub Copilot for Your Account

1. Go to [GitHub Copilot Settings](https://github.com/settings/copilot)
2. Subscribe to GitHub Copilot Individual if you haven't already
3. Configure which repositories Copilot can access:
   - Select **"Allow for all repositories"** (recommended for personal accounts), OR
   - Select **"Allow for select repositories"** and add `journey247/whistle-inn`

### Step 2: Install the VS Code Extension

1. Open Visual Studio Code
2. Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "GitHub Copilot"
4. Click **Install** on the "GitHub Copilot" extension
5. Sign in to GitHub when prompted
6. Authorize the extension to access your account

### Step 3: Verify Copilot is Working

1. Open any code file in the `whistle-inn` repository
2. Start typing a comment or function
3. You should see gray suggestion text from Copilot
4. Press **Tab** to accept a suggestion

## Instructions for Organization Repositories

If `journey247/whistle-inn` is owned by an organization:

### Step 1: Install GitHub Copilot GitHub App

1. Navigate to the [GitHub Copilot Marketplace page](https://github.com/marketplace/github-copilot)
2. Click **"Set up a plan"** or **"Install it for free"** (if using Copilot Business/Enterprise)
3. Select the organization that owns `journey247/whistle-inn`
4. Choose repository access:
   - Select **"Only select repositories"**
   - In the dropdown, find and select **`journey247/whistle-inn`**
5. Click **"Install"** or **"Install & Authorize"**

### Step 2: Authorize for SAML SSO (If Applicable)

If your organization uses SAML SSO:

1. Go to [GitHub Apps](https://github.com/settings/apps/authorizations)
2. Find **"GitHub Copilot"** in the list
3. Click **"Authorize"** next to your organization name
4. Complete the SAML SSO authentication flow

### Step 3: Assign Copilot Seats (Copilot Business/Enterprise)

Organization owners need to assign Copilot seats to team members:

1. Go to your organization settings: `https://github.com/organizations/journey247/settings/copilot`
2. Click **"Access management"** or **"Manage access"**
3. Select the users or teams who should have Copilot access
4. Click **"Add"** to grant them access

### Step 4: Install the VS Code Extension

Each team member should:

1. Open Visual Studio Code
2. Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "GitHub Copilot"
4. Click **Install** on the "GitHub Copilot" extension
5. Sign in to GitHub when prompted
6. Authorize the extension to access your organization

## How to Verify Copilot Can Access the Repository

Use this checklist to confirm Copilot is properly configured:

### Test Suggestions

1. Open the `journey247/whistle-inn` repository in VS Code
2. Create or open a code file (e.g., `.ts`, `.tsx`, `.js`)
3. Start typing a comment like `// Function to calculate`
4. Wait 1-2 seconds for Copilot suggestions (shown in gray)
5. If suggestions appear, press **Tab** to accept

### Confirm App Installation (Organization Repos)

1. Go to the repository: `https://github.com/journey247/whistle-inn`
2. Click **"Settings"** (requires admin access)
3. Click **"Integrations"** in the left sidebar
4. Under **"Applications"**, verify **"GitHub Copilot"** is listed

### Confirm License Assigned

1. Check the Copilot icon in VS Code status bar (bottom right)
2. Click the icon and verify:
   - Status shows **"Ready"** or **"Active"**
   - Your organization/account name is displayed
3. Or go to VS Code → Settings → search for "copilot" to see configuration

## Troubleshooting

If Copilot isn't working, check these common issues:

### No Suggestions Appearing

- **Check License**: Verify your Copilot subscription is active at [GitHub Copilot Settings](https://github.com/settings/copilot)
- **Check Extension**: Ensure the GitHub Copilot extension is installed and enabled in VS Code
- **Sign In**: Click the Copilot icon in VS Code status bar and sign in to GitHub
- **Restart VS Code**: Sometimes a restart is needed after installation

### "Copilot Not Available for This Repository"

- **Organization Settings**: Verify the repository is included in the Copilot app installation
  - Go to `https://github.com/organizations/journey247/settings/installations`
  - Click **"Configure"** next to GitHub Copilot
  - Ensure `journey247/whistle-inn` is selected under repository access
- **Personal Settings**: For personal repos, verify repository access at [GitHub Copilot Settings](https://github.com/settings/copilot)

### SAML SSO Authorization Issues

- **Authorize App**: Go to [GitHub Apps Authorizations](https://github.com/settings/apps/authorizations)
- **Find Copilot**: Locate "GitHub Copilot" and click **"Authorize"** for your organization
- **Complete SSO**: Follow your organization's SAML authentication process

### Not Assigned a Seat (Organization)

- **Contact Org Owner**: Ask your organization owner to assign you a Copilot seat
- **Check Assignment**: Organization owners can verify at `https://github.com/organizations/journey247/settings/copilot`
- **Wait for Sync**: It may take a few minutes for seat assignments to propagate

### Extension Not Signed In

- **Manual Sign In**: Click the Copilot icon in VS Code status bar → **"Sign in to GitHub"**
- **Authorize Extension**: Complete the GitHub authorization flow in your browser
- **Check Notifications**: Look for authorization prompts in VS Code notifications

### Network/Proxy Issues

- **Corporate Firewall**: Ensure your network allows connections to `*.github.com` and `*.githubcopilot.com`
- **Proxy Settings**: Configure VS Code proxy settings if behind a corporate proxy
- **VPN**: Try disconnecting from VPN if it's blocking GitHub services

## Official GitHub Documentation

For more detailed information, refer to these official GitHub resources:

### Personal Accounts
- [About GitHub Copilot Individual](https://docs.github.com/en/copilot/overview-of-github-copilot/about-github-copilot-individual)
- [Getting started with GitHub Copilot](https://docs.github.com/en/copilot/getting-started-with-github-copilot)
- [Configuring GitHub Copilot in your environment](https://docs.github.com/en/copilot/configuring-github-copilot/configuring-github-copilot-in-your-environment)

### Organizations
- [About GitHub Copilot Business](https://docs.github.com/en/copilot/overview-of-github-copilot/about-github-copilot-business)
- [Setting up GitHub Copilot for your organization](https://docs.github.com/en/copilot/setting-up-github-copilot/setting-up-github-copilot-for-your-organization)
- [Managing access for GitHub Copilot in your organization](https://docs.github.com/en/copilot/managing-copilot/managing-access-for-copilot-business-in-your-organization)
- [Installing the GitHub Copilot extension in Visual Studio Code](https://docs.github.com/en/copilot/getting-started-with-github-copilot?tool=vscode)

### Enterprise
- [About GitHub Copilot Enterprise](https://docs.github.com/en/copilot/github-copilot-enterprise/overview/about-github-copilot-enterprise)
- [Enabling GitHub Copilot for organizations in your enterprise](https://docs.github.com/en/copilot/managing-copilot/managing-github-copilot-in-your-organization/managing-access-for-copilot-business-in-your-organization)

---

**Need additional help?** Contact your organization administrator or visit [GitHub Support](https://support.github.com/).
