# HeckTeck AI - School Report Card Generator

An AI-powered Google Apps Script system for generating, managing, and distributing student report cards. Built for scale - supports multi-campus deployments with 30+ students per class.

## Features

- **AI-Powered Comments**: Automatically generates subject and general comments using Google Gemini AI
- **End of Term Reports**: Creates PDF report cards with full grade breakdown (CW, MT, EOT)
- **Midterm Reports**: Creates simpler midterm PDF reports with totals and comments
- **Multi-Channel Delivery**: Send reports via Email and WhatsApp with exponential backoff retry
- **Grammar & Style Polish**: AI-assisted comment refinement
- **Pronoun & Name Correction**: Automatic gender/name mismatch detection and fixing
- **Audit System**: Quality control checks before final delivery
- **Modern UI**: Beautiful, responsive sidebars with real-time progress tracking
- **Optimized Performance**: Batch operations for fast PDF generation (~60-90 seconds for 30 students)

## Performance

| Operation | Speed |
|-----------|-------|
| PDF Generation (30 students) | ~60-90 seconds |
| Comment Generation (batch) | ~2-3 seconds per 10 students |
| Email Delivery | ~200ms per email + retry backoff |
| WhatsApp Delivery | ~1 second per message + retry backoff |

## Project Structure

```
├── Main.js                    # Entry point, menu creation, main workflows
├── DynamicConfig.js           # Central configuration and dynamic column discovery
├── Setup.js                   # System setup and credential management
├── API.js                     # Gemini AI API integration with retry logic
│
├── SubjectCommentManager.js   # Subject-specific comment generation
├── GeneralCommentsManager.js  # Class teacher general comments
├── SubjectContextManager.js   # Subject context (grade, topics) storage
│
├── PolishManager.js           # Grammar and style polishing
├── PronounManager.js          # Pronoun correction
├── FixMismatchManager.js      # Name/gender mismatch fixes
├── AuditManager.js            # Quality control auditing
├── CleanupManager.js          # Final formatting (bold/white text)
│
├── ReportCardGenerator.js     # End of Term PDF generation (optimized batch ops)
├── MidtermReportGenerator.js  # Midterm PDF generation (optimized batch ops)
├── EmailManager.js            # Batch email with exponential backoff retry
├── WhatsappManager.js         # WhatsApp Business API with retry logic
│
├── FolderManager.js           # Google Drive folder management
├── StateManager.js            # Undo functionality
├── SelectionProcessor.js      # Smart range selection
├── RangeValidator.js          # Selection validation
├── GenderNormalizer.js        # Gender data normalization
│
├── Prompt*.js                 # AI prompt templates
├── TraitsConfig.js            # Character traits for general comments
├── StyleManager.js            # Text styling utilities
├── GCUiHelper.js              # HTML template helpers
│
├── Sidebar.html               # Batch processing sidebar (modern UI)
├── GCSidebar_*.html           # General comment sidebar components
├── SubjectContextSidebar.html # Subject context configuration
├── appsscript.json            # Apps Script manifest
└── .clasp.json                # Clasp deployment config
```

## Setup Instructions

### 1. Initial Deployment

1. Install [clasp](https://github.com/google/clasp): `npm install -g @google/clasp`
2. Login: `clasp login`
3. Push to Apps Script: `clasp push`

### 2. Configure Credentials

1. Open your Google Sheet
2. Go to **HeckTeck AI** menu → **Run System Health Check**
3. If credentials are missing, run Setup:
   - In Apps Script editor, open `Setup.js`
   - Update the `initialConfig` with your actual credentials
   - Run `runSystemSetup()`

### Required Credentials

| Setting | Description | Where to Get |
|---------|-------------|--------------|
| `GEMINI_API_KEY` | Google Gemini AI API key | [AI Studio](https://aistudio.google.com/app/apikey) |
| `WHATSAPP_TOKEN` | WhatsApp Business API token | [Meta Developers](https://developers.facebook.com/) |
| `WHATSAPP_PHONE_ID` | WhatsApp Business phone ID | Meta Business Suite |

### 3. Sheet Configuration

Your Google Sheet should have these tabs:

| Sheet Name | Purpose |
|------------|---------|
| `CLASSLIST` | Student names (Col B), IDs, gender (Col E) |
| `REPORT DATA` | End of Term aggregated grades and comments |
| `REPORT TEMPLATE` | End of Term report card template |
| `MIDTERM DATA` | Midterm aggregated grades and comments |
| `MIDTERM TEMPLATE` | Midterm report card template |
| `CONTACT LIST` | Parent contact info (email, phone, PDF ID, status) |
| Subject sheets | Individual subject grades (ENGLISH, MATHEMATICS, etc.) |

## Workflow

### Phase 1: Drafting Comments

1. **Set Subject Context**: Define grade level and topics for each subject
2. **Generate Subject Comments**: AI creates comments based on scores
3. **Generate General Comments**: Class teacher comments with trait selection

### Phase 2: Refining

1. **Polish Grammar & Style**: AI improves comment quality
2. **Fix Pronouns**: Correct he/she/his/her based on gender
3. **Fix Name Mismatches**: Detect and correct name/gender inconsistencies

### Phase 3: Quality Control

1. **Audit Comments**: Check for errors before finalizing
2. **Finalize Formatting**: Apply bold white text for printing

### Phase 4: Report Generation

**End of Term Reports:**
1. **EOT Preview**: Check first 2 students (~4-6 seconds)
2. **EOT Generate Full Batch**: Create all End of Term PDFs (~60-90 seconds for 30 students)

**Midterm Reports:**
1. **Midterm Preview**: Check first 2 students
2. **Midterm Generate Full Batch**: Create all Midterm PDFs

### Phase 5: Delivery

1. **Send via Email**: Batch send with PDF attachments (with automatic retry on failures)
2. **Send via WhatsApp**: Using WhatsApp Business API (with exponential backoff)

## Multi-Campus Deployment

This system is designed for large-scale deployment across multiple campuses.

### Recommended Architecture

| Scale | Configuration |
|-------|---------------|
| **Small** (1 campus, <10 classes) | Single Gemini API key, one Google Workspace account |
| **Medium** (1-2 campuses, 10-30 classes) | 1-2 Gemini API keys, shared WhatsApp Business account |
| **Large** (3+ campuses, 30+ classes) | Separate API key per campus, dedicated email quotas |

### Deployment Steps for Multiple Classes

1. **Create master spreadsheet** with all sheets configured
2. **Duplicate spreadsheet** for each class (File → Make a copy)
3. **Each copy is isolated**: Uses `DocumentProperties` so multiple tabs won't interfere
4. **Update class-specific values** in each copy (class name, teacher name, dates)

### Rate Limits & Quotas

| Resource | Free Tier Limit | Recommendation |
|----------|-----------------|----------------|
| Gemini API | 15 requests/minute | Split across campuses |
| Gmail (personal) | 100 emails/day | Use Workspace accounts |
| Gmail (Workspace) | 1,500 emails/day | One account per campus |
| WhatsApp Business | Varies by tier | Check Meta dashboard |

## Configuration Reference

### Sheet Names (in Script Properties)

```
CLASSLIST_SHEET_NAME      = "CLASSLIST"
REPORT_SHEET_NAME         = "REPORT DATA"
TEMPLATE_SHEET_NAME       = "REPORT TEMPLATE"
MIDTERM_SHEET_NAME        = "MIDTERM DATA"
MIDTERM_TEMPLATE_NAME     = "MIDTERM TEMPLATE"
CONTACT_SHEET_NAME        = "CONTACT LIST"
```

### Classlist Columns

```
CLASSLIST_NAME_COL        = 2    (Column B - Student Name)
CLASSLIST_GENDER_COL      = 5    (Column E - Gender)
```

### Other Settings

```
DATA_START_ROW            = 3    (First row of student data)
ATTENDANCE_TOTAL          = 64   (Total attendance days)
```

## Report Column Mapping

The report generators use `Config.REPORT_COLUMNS` and `Config.SUBJECT_CONFIG` for End of Term reports, and `Config.MIDTERM_COLUMNS` and `Config.MIDTERM_SUBJECT_CONFIG` for Midterm reports. 

### REPORT DATA Structure (End of Term)
Each subject has 7 columns: `CW 20, MT 20, EOT 60, EOT 100, GRADE, COMMENT, AVE`

Key columns:
- Column 0: INDEX
- Column 1: STUDENT ID
- Column 2: STUDENT NAME
- Columns 3-9: English
- Columns 10-16: Mathematics
- Columns 17-23: French
- Columns 24-30: Computing (ICT)
- Columns 31-37: Science
- Columns 38-44: Bible Knowledge
- Columns 45-51: Humanities
- Columns 52-55: Music
- Columns 56-68: Summary fields (Raw Score, Average, Best/Worst, Attendance, Comments)

### MIDTERM DATA Structure
Each subject has 4 columns: `100, GRADE, COMMENT, AVE`

Update column indices in `DynamicConfig.js` if your sheet layout changes.

## Technical Notes

### Batch Processing Safety

The system uses `DocumentProperties` (not `UserProperties`) to store batch queue data. This means:
- ✅ Opening Class 5A and Class 5B in separate tabs is safe
- ✅ Each spreadsheet maintains its own processing state
- ✅ No data cross-contamination between tabs

### Retry Logic

All external API calls include exponential backoff retry:

| Service | Max Retries | Backoff |
|---------|-------------|---------|
| Gemini API | 3 | 2s, 4s, 8s |
| WhatsApp Upload | 3 | 2s, 4s, 8s |
| WhatsApp Send | 3 | 2s, 4s, 8s |
| Gmail Send | 3 | 2s, 4s, 8s |

### Optimized PDF Generation

Report generators use `fillTemplateFast()` which batches setValue operations:
- **Before**: ~70 individual API calls per student
- **After**: ~10 batch API calls per student
- **Result**: 7x faster PDF generation

## Troubleshooting

### "API Key not configured"
Run Setup from the HeckTeck menu or manually set `GEMINI_API_KEY` in Script Properties.

### "Manager not found" errors
Ensure all files are properly pushed to Apps Script and there are no syntax errors.

### PDF not matching student
Check that student names in `REPORT DATA` exactly match names in `CONTACT LIST`.

### WhatsApp delivery fails
1. Verify `WHATSAPP_TOKEN` is valid and not expired
2. Check `WHATSAPP_PHONE_ID` is correct
3. Ensure phone numbers are in correct format (no spaces, include country code)

### Email delivery fails
1. Check daily quota: HeckTeck menu → System Health Check
2. Emails now auto-retry on "Service Unavailable" errors
3. For persistent failures, check recipient email validity

### Slow PDF generation
1. Ensure you're using the latest code with `fillTemplateFast()`
2. Preview first (2 students) to estimate batch time
3. Expected: ~2-3 seconds per student

## Security Notes

- **Never commit API keys** to version control
- Credentials are stored in Apps Script's Script Properties (encrypted)
- After initial setup, clear credentials from `Setup.js`
- Each spreadsheet copy maintains its own Script Properties

## UI Design System

The sidebars use a modern design system:

| Element | Value |
|---------|-------|
| Font | Inter |
| Primary Color | `#6366f1` (Indigo) |
| Success | `#10b981` (Emerald) |
| Error | `#ef4444` (Red) |
| Border Radius | 8-12px |

## License

Private - HeckTeck AI
