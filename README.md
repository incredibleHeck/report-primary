# HecTech AI - Primary School Report Card Generator

An AI-powered Google Apps Script system for generating, managing, and distributing student report cards. Built for multi-campus deployment using a **vault library + client shell** architecture.

**This is the PRIMARY DEPARTMENT workspace (`C:\googlesheets`).**

## Current State & Capabilities

The system has recently completed a "Production Readiness" overhaul, moving from rigid, hardcoded architectures to a fully dynamic mapping engine.

### 🌟 What We've Built So Far
- **Dynamic Subject Discovery**: The engine scans the spreadsheet at runtime to discover header positions and template rows. It natively supports the Primary layout (7 Scored Subjects + Music, PE, Clubs). 
- **Non-Scoring Subjects**: Dynamically handles subjects like "Arts" as practical/non-scoring subjects, ensuring academic averages remain accurate without manual intervention.
- **Dynamic Programme Labels**: The `PROGRAMME_NAME` is fully dynamic, eliminating hardcoded "PRIMARY" labels.
- **Vault + Shell Architecture**: All core code lives in this vault, while each campus spreadsheet simply runs a tiny "shell" script to connect. This allows you to update one codebase and deploy to all Primary campuses instantly.
- **IP Protection & License Lock**: Integrated a license verification switch (`verifyLicenseAuthorization()`). Only authorized spreadsheet IDs registered in the Vault's private library-space properties (`AUTHORIZED_CAMPUS_IDS`) can execute operations.
- **Autopilot Timeout Protection**: Midterm report generation and WhatsApp blaster batches automatically track runtime execution. If a run nears the 6-minute Apps Script ceiling (yield set at 230 seconds), the engine automatically schedules a background resubmission trigger to yield control and resume safely.
- **Premium Obsidian UI Theme**: Upgraded all HTML sidebars (Traits Comment Generator, Settings Panel, ChatBot Assistant, Progress Trackers) with a unified dark obsidian palette (#09090b backgrounds, neon violet buttons, electric green/orange accents).
- **Comprehensive Undo State Restorations**: Implemented a State Manager rollback engine that caches cell values, font weights, colors, and notes, allowing teachers to restore previous comments easily.
- **Atomic Telemetry Logs**: Standardized `DEBUG_LOG` with a `LockService` mutex lock to prevent cell write contentions when multiple background triggers log simultaneously.
- **AI-Powered Comments**: Context-aware subject comments and general teacher summaries via Google Gemini AI (`gemini-3.5-flash`).
- **Grammar & Style Polish**: Tools to correct pronouns, fix name mismatches, and refine tone.
- **Multi-Channel Delivery**: Batch email and WhatsApp delivery via Meta Business API with exponential backoff and retry logic.

## Architecture

```
┌──────────────────────────┐      ┌─────────────────────────────┐
│  HecTech Vault (Library) │◄─────│  School Spreadsheet (Clone) │
│  - Proprietary Core Code │      │  - Client_Shell.gs          │
│  - Private Secrets &     │      │  - Client properties:       │
│    Campus License Whitelist│    │    Class settings, school   │
│  - No UI container scopes│      │    metadata per campus      │
└──────────────────────────┘      └─────────────────────────────┘
```

- **Vault (this repo)**: Contains all intellectual property. Pushed via `clasp push` and published as a library. Contains no container UI scopes to maintain a narrow, secure execution boundary.
- **Client Shell**: A small connector script pasted into each school's Apps Script project. It hydrates the library with the school's Script Properties before every action.
- **Script Properties**: Live on each school's local project. Secrets (Gemini/WhatsApp API credentials) and campus settings are isolated here, protecting the vault from state bleeding.

## Performance

| Operation | Speed |
|-----------|-------|
| PDF Generation (30 students) | ~60-90 seconds |
| Comment Generation (batch) | ~2-3 seconds per 10 students |
| Email Delivery | ~200ms per email + retry backoff |
| WhatsApp Delivery | ~1 second per message + retry backoff |

## Setup & Deployment

1. **Vault Deployment**: Use `clasp push` to sync this Primary project up to Google Apps Script.
2. **School Setup**: See [`Client_Shell_Template/README_DEPLOYMENT.md`](Client_Shell_Template/README_DEPLOYMENT.md) for the step-by-step checklist on hydrating a spreadsheet with the `Client_Shell.js.txt` connector and matching `appsscript.json.txt` manifest.
3. **Class Customization**: Fill out Class Settings (Term, Year, Report Date, Programme) directly via the Sidebar UI in the Sheet.

### Required Script Properties (per school)

| Key | Description | Where to Get |
|-----|-------------|--------------|
| `GEMINI_API_KEY` | Google Gemini AI API key | [AI Studio](https://aistudio.google.com/app/apikey) |
| `WHATSAPP_TOKEN` | WhatsApp Business API Bearer token | [Meta Developers](https://developers.facebook.com/) |
| `WHATSAPP_PHONE_ID` | Phone number ID from Meta | Meta Business Suite |
| `WHATSAPP_TEMPLATE_NAME` | Template name (auto-filled: `student_report_pdf`) | WhatsApp Manager |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Template language code (auto-filled: `en`) | WhatsApp Manager |

## Workflow Phases

1. **Drafting**: Set context, auto-generate subject/general comments via AI.
2. **Refining**: Polish grammar, correct pronouns and name mismatches.
3. **Quality Control**: Audit comment tone, finalize white-bold text formatting.
4. **Report Generation**: Run EOT Preview, followed by Full Batch (PDF).
5. **Delivery**: Distribute via batch Email or WhatsApp.

## Technical Notes
- **Report Column Mapping**: Column indices are determined dynamically at runtime in `DynamicConfig.js` by matching header strings (e.g. `MATH`, `SCI`).
- **Batch Processing**: Uses `UserProperties` to store queue data. Multiple teachers can work in the same sheet without collisions.
- **Security**: Master Vault secrets (license lists) are kept private in Library properties. Campus properties only store local campus configs.
- **Ignore Rules**: The `.claspignore` is pre-configured to block developer testing tools (`Test.js`, `ScriptPropertiesLegacyCleanup.js`), dataset caches (`*.csv`), local node packages, and git configurations from production pushes.

## License
Private - HecTech AI
