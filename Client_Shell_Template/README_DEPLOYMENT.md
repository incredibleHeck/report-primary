# Deploying HecTech to a School

## Architecture

```
┌──────────────────────────┐      ┌────────────────────────────────┐
│  HecTech Vault (Library) │◄─────│  School Spreadsheet (Container)│
│  - All shared code       │      │  - Client_Shell.js (connector) │
│  - Published as library  │      │  - Script Properties (secrets) │
│  - You maintain this     │      │  - One per class / school      │
└──────────────────────────┘      └────────────────────────────────┘
```

- **Vault** = this repo. Contains all logic. Published as an Apps Script library.
- **Container** = each school's Google Sheet. Has a small `Client_Shell.js` that calls the vault, plus its own Script Properties for credentials and class settings.
- Script Properties **live on each container** (not the vault). The vault reads them via `ClientScriptPropertiesBridge` at runtime.

## Step-by-step: New School Setup

### 1. Prepare the vault (you, one time)

1. Push code: `clasp push` from this repo.
2. In Apps Script editor: **Deploy > Library** and note the **Script ID**.
3. Publish a new **version number** when you want schools to update.

### 2. Create the school's spreadsheet

1. Duplicate the master spreadsheet template (**File > Make a copy**).
2. Ensure these sheet tabs exist: `CLASSLIST`, `REPORT DATA`, `REPORT TEMPLATE`, `MIDTERM DATA`, `MIDTERM TEMPLATE`, `CONTACT LIST`, plus subject sheets.

### 3. Set up the school's Apps Script project

1. Open the school spreadsheet > **Extensions > Apps Script**.
2. Delete any default `Code.gs` content.
3. Paste the full contents of `Client_Shell_Template/Client_Shell.js.txt`.
4. Go to **Libraries (+)** > paste the vault **Script ID** > select the latest **version** > set identifier to exactly **`HecTechVault`** > Save.

### 4. Set Script Properties (credentials)

In the school's Apps Script project: **Project settings > Script properties** > add these keys:

| Key | Value | Required? |
|-----|-------|-----------|
| `GEMINI_API_KEY` | Your Gemini API key | Yes |
| `WHATSAPP_TOKEN` | Meta WhatsApp Bearer token | Yes (for WA sends) |
| `WHATSAPP_PHONE_ID` | Meta phone number ID | Yes (for WA sends) |
| `WHATSAPP_TEMPLATE_NAME` | e.g. `student_report_pdf` | Auto-filled from vault defaults |
| `WHATSAPP_TEMPLATE_LANGUAGE` | e.g. `en`, `en_US`, or `en_GB` | Auto-filled from vault defaults |

Non-secret defaults (`GEMINI_MODEL_NAME`, sheet names, `DATA_START_ROW`, etc.) are **automatically merged** from the vault when the sheet is opened, so you don't need to set them unless the school uses different values.

### 5. Verify

1. **Refresh** the spreadsheet (close and reopen).
2. The **HecTech AI** menu should appear.
3. Run **System Health Check** from the menu — all items should show OK.
4. (Optional) Run `testGeminiConnection()` and `testWhatsAppTemplateSend()` from the script editor to verify connectivity before doing a real batch.

## Updating Schools

When you push new code to the vault:

1. **Publish a new library version** in Apps Script.
2. Each school's project: **Libraries > your vault > update to the new version > Save**.
3. Reopen the sheet. New bundled defaults (if any) are merged automatically.
4. **No need to re-paste `Client_Shell.js`** unless you changed the shell itself.

## Same WhatsApp number for all schools?

If every school sends from the **same** Meta number, all schools use the **same** `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TEMPLATE_NAME`, and `WHATSAPP_TEMPLATE_LANGUAGE` values. Copy them across.

If each school has its **own** Meta number, each gets **different** values.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Menu doesn't appear | Check library is connected with identifier `HecTechVault` |
| `#132001 Template not found` | `WHATSAPP_TEMPLATE_NAME` + `WHATSAPP_TEMPLATE_LANGUAGE` must match Meta exactly (try `en` vs `en_US`) |
| WhatsApp text test works but batch fails | Text messages skip templates; the batch uses them. Fix template name/language. |
| Settings not loading | Ensure Script Properties are on the **school's** project, not the vault |
| `API Key not configured` | Add `GEMINI_API_KEY` to the school's Script Properties |
