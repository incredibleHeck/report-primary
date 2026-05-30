# 🎓 HecTech 2.0 - School Campus Setup & Deployment Guide

This guide is designed for school operators, IT administrators, or deployment managers. Follow these steps sequentially to set up a new school campus sheet with connection links to the central **HecTech Vault Master Library**.

---

## 🧭 System Architecture Simplified

To protect HecTech intellectual property and billing credentials, the system is divided into two parts:
1. **The Vault Library (Central API)**: Contains all the complex AI code and private credentials. You manage this. The school cannot see or copy this code.
2. **The Campus Spreadsheet Shell (Client Template)**: The Google Sheet you distribute to the school. It contains zero proprietary code—only a small connector file (`Client_Shell.js.txt`) and configuration keys that speak to the Vault.

If a school cancels their contract, you can deactivate their Spreadsheet ID from your central panel, instantly turning their sheet into a non-functional grid template.

---

## 🛠️ Step 1: Whitelist the Campus Sheet ID (Licensing Security)

Before the campus spreadsheet can talk to the HecTech Vault, you must register its ID on your central whitelist. **If you skip this step, the school will see a "License Blocked" warning on open.**

1. Open the new campus Google Sheet.
2. Look at the browser's address bar. Copy the long string of letters and numbers between `/d/` and `/edit`.
   * *Example URL*: `https://docs.google.com/spreadsheets/d/1A2b3c4d5e6f7g8h9i0j_k1l2m3n4o5p6q7r8s9t/edit#gid=0`
   * *Spreadsheet ID to copy*: `1A2b3c4d5e6f7g8h9i0j_k1l2m3n4o5p6q7r8s9t`
3. Open your **Master Vault script container**.
4. Set the Spreadsheet ID under the library's `AUTHORIZED_CAMPUS_IDS` settings, or append it to the comma-separated authorization list. *(Developers can set `AUTHORIZED_CAMPUS_IDS = "*"` during testing to temporarily bypass this check).*

---

## ⚙️ Step 2: Configure the Campus Apps Script Editor

To link the spreadsheet to the vault library, configure the Apps Script workspace on the school sheet.

1. Inside the campus Google Sheet, click **Extensions > Apps Script** in the top menu.
2. Click the **Project Settings (the cog icon ⚙️)** on the left-side panel.
3. Check the box that says: **"Show 'appsscript.json' manifest file in editor"**.
4. Click the **Editor (the angle brackets icon <>)** on the left-side panel to return to the files list. You will now see a new file named `appsscript.json` in the list.

---

## 📝 Step 3: Paste the Manifest Configuration

1. Click on `appsscript.json` in the file list.
2. Delete everything inside it completely.
3. Open the file [Client_Shell_Template/appsscript.json.txt](appsscript.json.txt) in this folder.
4. Copy the entire contents of that file and paste it directly into the school's `appsscript.json` file.
5. Click **Save (the floppy disk icon 💾)** or press `Ctrl + S`.
   * *Note*: This automatically configures all Google authorization scopes and pre-installs the `HecTechVault` library reference (pointing to Vault Script ID `1zX6RSBTZSMLPig93Hwxh6pdiPKJGw5wUkqV4aDn1KzYq2ROtuwaPVS0P`).

---

## 🔌 Step 4: Add the Client Connector Code

1. In the file list on the left, click the **+ (Add a file)** icon next to "Files" and select **Script**.
2. Name the new file exactly **`Client_Shell`**. (Delete any default code like `function myFunction() {}`).
3. Open the file [Client_Shell_Template/Client_Shell.js.txt](Client_Shell.js.txt) in this folder.
4. Copy the entire contents of that file and paste it directly into the school's `Client_Shell.gs` editor.
5. Click **Save (💾)**.

---

## 🔑 Step 5: Add School Credentials (Script Properties)

Add the required API credentials inside the school's private container settings.

1. In the Apps Script window, click the **Project Settings (the cog icon ⚙️)**.
2. Scroll down to the **Script Properties** section and click **Add script property**.
3. Add the following parameters one by one:

| Property Name (Key) | What to Paste (Value) | Required? |
|---------------------|-----------------------|-----------|
| `GEMINI_API_KEY` | Your Google Gemini AI API key | Yes |
| `WHATSAPP_TOKEN` | Meta WhatsApp Business Graph API Bearer token | Yes (for WA sends) |
| `WHATSAPP_PHONE_ID` | Phone number ID from Meta Developers Panel | Yes (for WA sends) |
| `WHATSAPP_TEMPLATE_NAME` | Template name registered at Meta (e.g. `student_report_pdf`) | Optional (auto-defaults) |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Language code registered at Meta (e.g. `en` or `en_US`) | Optional (auto-defaults) |

4. Click **Save script properties**.

---

## 🏥 Step 6: Verify and Run Connection Tests

1. Go back to the campus Google Sheet and **refresh the browser tab (F5)**.
2. Wait 5-10 seconds. A new menu option named **`HecTech AI 🎓`** and a **`💬 AI Chatbot`** menu will appear at the top.
3. Click **HecTech AI 🎓 > 🏥 Run System Health Check**.
   * A sidebar will open on the right and check if your tabs (`CLASSLIST`, `REPORT DATA`, subject sheets) are formatted correctly.
4. Click **HecTech AI 🎓 > 🔌 Test WhatsApp Connection** and **🤖 Test Gemini Connection** to verify that your keys and tokens connect successfully before teachers start writing reports.

---

## 👥 Sheet Layout Requirements (For Reference)

Make sure the Google Sheet contains these exact tab names, starting student rows at **Row 3** (Row 1 is headers, Row 2 is sub-headers):
* **CLASSLIST**: Column A (ID), Column B (Student Name), Column C (Gender), Column D (Class Email).
* **REPORT DATA / REPORT TEMPLATE**: Contains scores, grades, and comments.
* **Subject Tabs**: (e.g., `MATH`, `SCIENCE`) contain scores and student rows starting at Row 3.

---

## 🔄 How to Push Vault Updates to Campus Sheets
When you update the vault code in the future:
1. Push code from your terminal: `clasp push`
2. Go to your central Apps Script panel and deploy a new **Library version**.
3. In each school's script editor: Click **Libraries > HecTechVault** on the left, update the **version number** to the newest version, and click **Save**.
4. Re-opening the spreadsheet will load all updates automatically. You **do not** need to re-paste the connector script.

Private - HecTech AI
