# 🎓 HecTech AI - Teacher Instruction Manual

Welcome to HecTech AI! This intelligent assistant is built directly into your Google Sheet to help you write high-quality, personalized student reports in a fraction of the time.

Please read this quick guide before you begin to ensure a smooth experience.

---

## ⚠️ GOLDEN RULES (Please Read First)
1. **Use the Menu:** All tools are located in the top menu bar under **"HecTech AI 🎓"**. (It may take a few seconds to appear when you first open the sheet).
2. **Select Before You Run:** For most actions (like generating or polishing comments), you must **highlight the cells** you want the AI to process BEFORE clicking the menu button.
3. **Do Not Rename Core Tabs:** Please do not rename the master tabs like `CLASSLIST`, `REPORT DATA`, or `CONTACT LIST`. The system relies on these names.
4. **Wait for the Sidebar:** When you run a batch action, the premium dark-themed progress sidebar will open on the right. Please wait for the progress bar to reach 100% or show completion before closing it.

---

## 📝 STEP 1: Initial Setup (Class Teacher / Admin)
Before generating any comments, ensure the report parameters are correct.
1. Click **HecTech AI 🎓 > ⚙️ Class Settings**.
2. The Obsidian-themed Class Settings panel will open. Fill in the Term, Year, Report Date, Resumption Date, and Class Teacher Name.
3. Click **Save**. (This data will automatically appear on the final PDFs).

---

## 📚 STEP 2: Subject Teachers (Generating Subject Comments)
If you teach a specific subject (e.g., Math, Science), follow these steps in your specific subject tab:

1. **Set the Context:** 
   * Go to your subject tab.
   * Click **HecTech AI 🎓 > 📝 1a. Set Subject Context (Topics)**.
   * The sidebar will load. Enter the Grade level and the specific topics covered this term (e.g., "Fractions, Decimals, Plant Life").
   * **Real-time Indicator**: The sidebar sanitizes your commas on the fly and shows the active valid topic count in neon green. Click **Save**.
2. **Generate Comments:**
   * Highlight the cells in the "COMMENT" column where you want the AI to write.
   * Click **HecTech AI 🎓 > ⚡ 1b. Auto-Generate Subject Comments**.
   * The AI will read the student's score, gender, and your topics to write a personalized comment.
   * **Output Highlight**: Newly generated comments will write in high-visibility **Neon Green (`#39FF14`)** to stand out on dark sheets.

---

## 👤 STEP 3: Class Teachers (Generating General Comments)
To write overall behavioral and academic summaries for the term:

1. Go to the **CLASS GENERAL** or **CLASSLIST** tab.
2. Click **HecTech AI 🎓 > 👤 2. Class Teacher General Comment**.
3. A checkbox-driven sidebar will open. It will automatically detect which student row you have clicked on.
4. Check the boxes for the traits that apply to that student (e.g., "Attentive", "Needs focus", "Team player").
5. Click **Generate Comment**. The AI will craft a beautiful paragraph based on your selections.

---

## 💬 STEP 3b: AI Chatbot Workspace (Creative Partner)
For custom comment editing, vocabulary adjustments, or brainstorming alternative student remarks:

1. Click the top menu option **💬 AI Chatbot > 💬 Open Chatbot Workspace**.
2. **Context-Aware Assistance**: The chatbot automatically pulls the student's name, gender, and selected text from the row you are currently on to personalize its suggestions.
3. **Write-Back Buttons**: You can converse with the AI to refine a draft, then click **Insert** to overwrite the active cell, or **Append** to add the suggestion to the end of the cell.
4. **Pedagogical Jargon Filters**: The chatbot automatically maps suggestions to UK English, strips out generic American terms (translating *worksheets* to *exercises*, *notebooks* to *exercise books*), and removes complex educational jargon (*pedagogical competency* becomes *test scores*).

---

## 🎨 STEP 4: Quality Control & Polishing (For All Teachers)
Once comments are drafted, use these tools to perfect them. **Remember to highlight the text you want to fix first!**

* **🎨 Polish Grammar & Style:** Rewrites the text to sound more professional and fixes grammatical errors.
* **⚧ Fix Pronouns:** Automatically scans the text and ensures the correct pronouns (he/she/his/her) are used based on the student's gender in the master classlist. Corrected cells are highlighted in **Neon Cyan (`#00f9ff`)**.
* **🔍 Fix Name Mismatches:** Ensures the name mentioned in the comment matches the actual student's name for that row. Repaired cells are highlighted in **Neon Orange (`#FF6600`)**.
* **🛡️ Vet and Audit:** Highlights potential issues or overly harsh language for you to review.

---

## 📄 STEP 5: Generating & Distributing Reports (Admin / Class Teacher)
When all comments and scores are finalized:

1. **Run a Health Check:** Click **HecTech AI 🎓 > 🏥 Run System Health Check** to ensure no data is missing.
2. **Preview:** Click **📄 EOT Preview** or **Midterm Preview** to generate PDFs for just the first two students. Check them carefully!
3. **Generate All:** Click **🚀 EOT Generate Full Batch (PDFs)** or **Midterm Batch**. The system will create PDFs for the whole class and save them to your Google Drive.
4. **Send Reports:** 
   * Use **📧 Send Reports via Email** or **📱 Send via WhatsApp**.
   * **Autopilot Loops**: For large classes, the blaster engine monitors Google's 6-minute ceiling. If a batch run takes too long, it will automatically register a continuation trigger to resume sending in 60 seconds without dropping execution.
   * **Delivery Status Highlights**:
     * **Deep Emerald (`#0A2F1D` background / `#39FF14` text)**: Delivery Success.
     * **Deep Maroon (`#441015` background / `#FF3333` text)**: Delivery Failure (invalid emails or contact details will skip retries immediately).

---

## ❓ Troubleshooting
* **"Please select a column with comments"**: You forgot to highlight the cells before clicking the menu. Highlight the cells and try again.
* **"Session expired"**: If you leave the sheet open for a long time, the sidebar might lose its connection. Just highlight your cells and click the menu button again.
* **Menu isn't showing up**: Refresh the page and wait about 5-10 seconds.
* **Need to undo?**: Click **HecTech AI 🎓 > ↩ Undo Last Action**.
  * **Upgraded Rollbacks**: Unlike standard sheets undo, HecTech's undo restores the exact text values, bold font weights, color highlight overlays, and cell warning notes simultaneously.
* **Batch Cancellation**: You can safely click "Cancel" in the progress tracker. The system will let active web threads settle and cleanly report stopped state metrics without locking up.

Private - HecTech AI