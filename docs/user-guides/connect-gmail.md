# Connect your Gmail account

InboxTriage can send and receive your email through Gmail. You connect it with a Google app password, which is a separate 16-character code that only InboxTriage uses. Your normal Google password will not work.

## Before you start

This works with two kinds of Google accounts:

- A personal Gmail account, with an address ending in `@gmail.com`.
- A paid Google Workspace account. This is Gmail on your own domain, such as `you@yourstudio.com`, managed at admin.google.com.

Not sure which one you have? If you sign in to Gmail with an address on your own domain, and someone at your studio can open admin.google.com and see Workspace settings, you use Google Workspace.

You need:

- 2-Step Verification turned on for your Google account.
- On Google Workspace, your admin must first check the settings in the next section.

## For Google Workspace admins

Skip this section if you use a personal Gmail account.

Sign in to admin.google.com and check these settings:

1. Go to **Security** > **Authentication** > **2-Step Verification**. Check **Allow users to turn on 2-Step Verification**. If you enforce 2-Step Verification, the allowed methods must not be set to **Only security key**.
2. Go to **Apps** > **Google Workspace** > **Gmail** > **End User Access** > **POP and IMAP access**. Turn on IMAP access for your users. Mail clients must not be limited to **OAuth mail clients only**.
3. Make sure the person connecting to InboxTriage is not enrolled in Advanced Protection.

Changes can take up to 24 hours to reach users. Google renames Admin console menus from time to time, so the names you see may differ slightly.

## Create an app password

1. Go to myaccount.google.com and open **Security** > **2-Step Verification**. Turn it on using your phone or an authenticator app. Skip this step if it is already on.
2. Open myaccount.google.com/apppasswords. Google often leaves this page out of its menus, so type the address directly, or search for "App passwords" in the search box at the top of your Google Account. Google may ask you to sign in again.
3. Enter a name you will recognize later, such as "InboxTriage", and click **Create**.
4. Copy the 16-character code. Google shows it in four groups, like `abcd efgh ijkl mnop`. You will only see it once, so paste it into InboxTriage before you close the window.

## Connect in InboxTriage

1. In InboxTriage, open **Settings** > **Email**.
2. Choose **Gmail** as the provider.
3. In **Email**, enter your email address. Custom-domain addresses work too.
4. In **App password**, paste the code from Google. You can leave the spaces in. InboxTriage removes them.
5. Click **Save**. InboxTriage signs in to Gmail to check the app password before saving, which can take a few seconds.

If you already have a Zoho connection, InboxTriage asks you to confirm the switch. Gmail then replaces Zoho. You can only have one email connection at a time.

## Troubleshooting

**You can't find the App passwords page.** Google hides it when any of these apply:

- 2-Step Verification is off.
- Your 2-Step Verification uses security keys only.
- Your account is enrolled in Advanced Protection.
- On Google Workspace, your admin does not allow 2-Step Verification, or allows security keys only.

**InboxTriage says "Gmail rejected the app password" when you save.** Nothing was saved. Check that you pasted the app password and not your normal Google password, and that the email address is the one you created the app password for. If you're unsure, create a new app password and enter that one. On Google Workspace, also ask your admin to check the IMAP setting above: IMAP must be on, and mail clients must not be limited to OAuth mail clients only.

**InboxTriage says "Couldn't reach the mail server" when you save.** Nothing was saved. InboxTriage couldn't connect to Gmail, usually because of a brief network problem. Wait a minute and click **Save** again.

**You changed your Google password.** Google cancels all your app passwords when you do this, and your inbox in InboxTriage says Gmail rejected the saved app password. Create a new app password, then enter it in InboxTriage under **Settings** > **Email**.

**You want to remove InboxTriage's access.** Go to myaccount.google.com/apppasswords and delete the "InboxTriage" entry. After that, InboxTriage can no longer send or receive your email. To remove the connection from InboxTriage as well, open **Settings** > **Email** and click **Disconnect Gmail**.
