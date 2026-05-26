# HecTech AI - School Report Card Generator

An AI-powered Google Apps Script system for generating, managing, and distributing student report cards. Built for multi-school deployment using a **vault library + client shell** architecture.

## Architecture

```
┌──────────────────────────┐      ┌─────────────────────────────┐
│  HecTech Vault (Library) │◄─────│  School Spreadsheet (Clone) │
│  - All shared code       │      │  - Client_Shell.js          │
│  - DynamicConfig, API,   │      │  - Script Properties:       │
│    Managers, Sidebars    │      │    API keys, tokens, class  │
│  - Published as library  │      │    settings per school      │
└──────────────────────────┘      └─────────────────────────────┘
```

- **Vault (this repo)**: contains all logic. Pushed via `clasp push` and published as a library.
- **Client Shell**: a small connector script pasted into each school's Apps Script project. It hydrates the library with the school's Script Properties before every menu action.
- **Script Properties**: live on each school's project (not the vault). Secrets (API keys, tokens) and per-class settings are stored there.

## Features

- **AI-Powered Comments**: Subject and general comments via Google Gemini AI
- **End of Term Reports**: Full PDF report cards (CW, MT, EOT breakdown)
- **Midterm Reports**: Simpler midterm PDF reports
- **Multi-Channel Delivery**: Email and WhatsApp with exponential backoff retry
- **Grammar & Style Polish**: AI-assisted comment refinement
- **Pronoun & Name Correction**: Gender/name mismatch detection
- **Audit System**: Quality control before delivery
- **Modern UI**: Responsive sidebars with real-time progress
- **Bundled Defaults**: Non-secret defaults auto-merge into school projects on open

## Performance

| Operation | Speed |
|-----------|-------|
| PDF Generation (30 students) | ~60-90 seconds |
| Comment Generation (batch) | ~2-3 seconds per 10 students |
| Email Delivery | ~200ms per email + retry backoff |
| WhatsApp Delivery | ~1 second per message + retry backoff |

## Project Structure

```
├── Main.js                        # Menu, health check, entry points
├── DynamicConfig.js               # Central config with lazy-loaded getters
├── Setup.js                       # Interactive credential setup (prompts, no hardcoded secrets)
├── API.js                         # Gemini API with retry logic
├── ClientScriptPropertiesBridge.js # Reads container Script Props into library
├── ClientContainerDefaults.js     # Bundled non-secret defaults for school projects
│
├── SubjectCommentManager.js       # Subject comment generation
├── GeneralCommentsManager.js      # Class teacher general comments
├── SubjectContextManager.js       # Subject context (grade, topics) storage
│
├── PolishManager.js               # Grammar and style polishing
├── PronounManager.js              # Pronoun correction
├── FixMismatchManager.js          # Name/gender mismatch fixes
├── AuditManager.js                # Quality control auditing
├── CleanupManager.js              # Final formatting (bold/white text)
│
├── ReportCardGenerator.js         # End of Term PDF generation
├── MidtermReportGenerator.js      # Midterm PDF generation
├── EmailManager.js                # Batch email with retry
├── WhatsappManager.js             # WhatsApp Business API (Graph v25)
│
├── FolderManager.js               # Google Drive folder management
├── StateManager.js                # Undo functionality
├── SelectionProcessor.js          # Smart range selection
├── RangeValidator.js              # Selection validation
├── GenderNormalizer.js            # Gender data normalization
├── SettingsManager.js             # Class settings sidebar logic
│
├── Prompt*.js                     # AI prompt templates
├── TraitsConfig.js                # Character traits for general comments
├── StyleManager.js                # Text styling utilities
│
├── Sidebar.html                   # Batch processing sidebar
├── GCSidebar_*.html               # General comment sidebar components
├── SettingsSidebar.html           # Class settings sidebar
├── SubjectContextSidebar.html     # Subject context sidebar
├── appsscript.json                # Apps Script manifest
├── .clasp.json                    # Clasp deployment config
├── .claspignore                   # Files excluded from push
│
├── Client_Shell_Template/         # Template for school container projects
│   ├── Client_Shell.js.txt        # The connector script schools paste in
│   └── README_DEPLOYMENT.md       # Step-by-step school setup guide
│
├── Test.js                        # Smoke tests (excluded from clasp push)
└── ScriptPropertiesLegacyCleanup.js  # Admin cleanup tool (excluded from push)
```

## Setup

### Developer Setup (Vault)

1. Install [clasp](https://github.com/google/clasp): `npm install -g @google/clasp`
2. Login: `clasp login`
3. Push: `clasp push`
4. In Apps Script: **Deploy > Library** and note the Script ID.

### School Setup

See [`Client_Shell_Template/README_DEPLOYMENT.md`](Client_Shell_Template/README_DEPLOYMENT.md) for the full step-by-step checklist.

**Quick summary:**
1. Duplicate the master spreadsheet template.
2. Open **Extensions > Apps Script** and paste `Client_Shell.js.txt`.
3. Add the vault as a library (identifier: `HecTechVault`).
4. Set **Script Properties**: `GEMINI_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`.
5. Reopen the sheet. Non-secret defaults auto-merge from the vault.
6. Run **System Health Check** from the menu to verify.

### Required Script Properties (per school)

| Key | Description | Where to Get |
|-----|-------------|--------------|
| `GEMINI_API_KEY` | Google Gemini AI API key | [AI Studio](https://aistudio.google.com/app/apikey) |
| `WHATSAPP_TOKEN` | WhatsApp Business API Bearer token | [Meta Developers](https://developers.facebook.com/) |
| `WHATSAPP_PHONE_ID` | Phone number ID from Meta | Meta Business Suite |
| `WHATSAPP_TEMPLATE_NAME` | Template name (auto-filled: `student_report_pdf`) | WhatsApp Manager |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Template language code (auto-filled: `en`) | WhatsApp Manager |

## Workflow

### Phase 1: Drafting
1. **Set Subject Context** — grade level and topics per subject
2. **Generate Subject Comments** — AI creates comments from scores
3. **General Comments** — class teacher comments with trait selection

### Phase 2: Refining
1. **Polish Grammar & Style**
2. **Fix Pronouns** (he/she/his/her)
3. **Fix Name Mismatches**

### Phase 3: Quality Control
1. **Audit Comments** — check for errors
2. **Finalize Formatting** — bold white text for printing

### Phase 4: Report Generation
- **EOT Preview** then **Full Batch** (PDFs)
- **Midterm Preview** then **Full Batch**

### Phase 5: Delivery
- **Email** — batch send with PDF attachments
- **WhatsApp** — template message with PDF via Meta Business API

## Multi-School Deployment

| Scale | Configuration |
|-------|---------------|
| Small (1 campus, <10 classes) | Single Gemini key, one WhatsApp number |
| Medium (1-2 campuses, 10-30 classes) | 1-2 Gemini keys, shared WhatsApp account |
| Large (3+ campuses, 30+ classes) | Separate keys per campus, dedicated email quotas |

### Updating Schools

1. Push new code to the vault and publish a new **library version**.
2. Each school: update the library version in their project.
3. Reopen the sheet — new bundled defaults merge automatically.
4. No need to re-paste `Client_Shell.js` unless the shell itself changed.

## Configuration

### Sheet Names (auto-filled from vault defaults)

| Property | Default |
|----------|---------|
| `CLASSLIST_SHEET_NAME` | CLASSLIST |
| `REPORT_SHEET_NAME` | REPORT DATA |
| `TEMPLATE_SHEET_NAME` | REPORT TEMPLATE |
| `MIDTERM_SHEET_NAME` | MIDTERM DATA |
| `MIDTERM_TEMPLATE_NAME` | MIDTERM TEMPLATE |
| `CONTACT_SHEET_NAME` | CONTACT LIST |

### Report Column Mapping

Column indices for REPORT DATA and MIDTERM DATA are defined in `DynamicConfig.js` (`REPORT_COLUMNS`, `SUBJECT_CONFIG`, `MIDTERM_COLUMNS`, `MIDTERM_SUBJECT_CONFIG`). Update these if your sheet layout differs from the default YEAR 5A structure.

## Technical Notes

### Batch Processing

The system uses `UserProperties` to store batch queue data per user. Multiple teachers can work in the same sheet without collisions as long as they avoid running batches in the same tab simultaneously.

### Retry Logic

| Service | Max Retries | Backoff |
|---------|-------------|---------|
| Gemini API | 3 | 2s, 4s, 8s |
| WhatsApp Upload | 3 | 2s, 4s, 8s |
| WhatsApp Send | 3 | 2s, 4s, 8s |
| Gmail Send | 3 | 2s, 4s, 8s |

### Rate Limits

| Resource | Free Tier Limit | Recommendation |
|----------|-----------------|----------------|
| Gemini API | 15 req/min | Split across campuses |
| Gmail (personal) | 100 emails/day | Use Workspace accounts |
| Gmail (Workspace) | 1,500 emails/day | One account per campus |
| WhatsApp Business | Varies by tier | Check Meta dashboard |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Menu doesn't appear | Check library is connected with identifier `HecTechVault` |
| `API Key not configured` | Add `GEMINI_API_KEY` to the school's Script Properties |
| `#132001 Template not found` | `WHATSAPP_TEMPLATE_NAME` + `WHATSAPP_TEMPLATE_LANGUAGE` must match Meta exactly |
| Text test works but batch fails | Text messages skip templates; batch sends use them. Fix template config. |
| PDF not matching student | Student names in REPORT DATA must match CONTACT LIST exactly |
| Slow PDF generation | Expected ~2-3 seconds per student with `fillTemplateFast()` |
| `Manager not found` errors | Ensure all files pushed to Apps Script with no syntax errors |

## Security

- Secrets are **never stored in source code**. `Setup.js` uses interactive prompts.
- Credentials are saved to Script Properties (encrypted by Google).
- Each school's Script Properties are isolated from the vault and other schools.
- **Never commit API keys or tokens** to version control.

## License

Private - HecTech AI
