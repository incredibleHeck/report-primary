# Setting up the HecTechVault Library (Option 2)

This guide will walk you through splitting your project into a secure **Vault** (where your code lives) and a **Client Shell** (what you give to schools).

## Step 1: Deploy your current code as a Library
1. In your current Apps Script editor (the one with all your files), click **Deploy** (top right) > **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" and choose **Library**.
3. Give it a description (e.g., "v1.0 Production").
4. Click **Deploy**.
5. You will see a **Library URL** and a **Script ID**. 
6. **Copy the Script ID** and save it somewhere safe.

## Step 2: Set up the Client Google Sheet
1. Create a brand new Google Sheet (this is the one you will duplicate and share with schools).
2. Go to **Extensions > Apps Script**.
3. Delete the default `function myFunction() {}` code.
4. Open the `Client_Shell.js` file in this folder (`Client_Shell_Template/Client_Shell.js`).
5. **Copy all the code** from `Client_Shell.js` and paste it into the Apps Script editor of the new Google Sheet.
6. Rename the file in the editor from `Code.gs` to `Main.gs` (optional, but good practice).

## Step 3: Connect the Library
1. In the new Apps Script editor, look at the left sidebar. Next to **Libraries**, click the **+** button.
2. Paste the **Script ID** you copied in Step 1.
3. Click **Look up**.
4. Select the latest version (e.g., 1).
5. **CRITICAL:** Change the "Identifier" field to exactly: `HecTechVault`
6. Click **Add**.

## Step 4: Test it!
1. Go back to the new Google Sheet.
2. Refresh the page.
3. You should see the "HecTech AI 🎓" menu appear!
4. Try opening a sidebar or running a command. It will securely call your hidden library code.

## How to update your code in the future:
1. Make changes to your original project (the Vault).
2. Click **Deploy > Manage deployments**.
3. Click the pencil icon (Edit) on your active deployment.
4. Under "Version", select **New version**.
5. Click **Deploy**.
6. The client sheets will automatically use the new version if they are set to use the "HEAD" version, or you can update the version number in their Library settings.