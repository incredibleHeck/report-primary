// ==========================================
// HECTECH PromptAudit.js (Hardened Production)
// ==========================================

const PromptAudit = {

    /**
     * PROMPT: Audit / Analysis
     * Checks if the comment matches the Student metadata and professional standards.
     * Synchronized with HecTech 2.0 dual-mode closure mechanics, hyper-realism constraints, and local staffroom terms.
     */
    getAnalysisPrompt: (data) => {
        // Automatically detect if the payload consists of Subject/Club Data or General Class Summaries
        const sampleItem = Array.isArray(data) ? data[0] : data;
        const isGeneralCommentAudit = sampleItem && (sampleItem.lowestSubjects !== undefined || sampleItem.averageScore !== undefined);

        return `
        You are a Strict Quality Control Auditor for School Report Cards (primary and secondary / JHS/SHS).
        
        🚨 CRITICAL GROUND TRUTH MANDATE:
        The Name, Gender, Score, and Academic Indicators provided in the INPUT DATA are the absolute ground truth from the school database. 
        - Even if a name sounds traditionally female (e.g., "Ellona" or "Elliana"), if the database says "Male", you MUST treat that student as Male. 
        - Never let your analysis override explicit data records.

        INPUT DATA: 
        ${JSON.stringify(data)}

        STRICT RULES FOR ANALYSIS:

        1. NAME INTEGRITY (Type: "NAME_MISMATCH"):
           - Flag if the comment mentions a completely different name.
           - Flag minor spelling deviations from the database input field.
           - Flag if artificial prefixes like "your child [Name]" or "your ward [Name]" are used. The name must stand on its own naturally (e.g., "Kofi", "Yaa").

        2. GENDER INTEGRITY (Type: "PRONOUN_MISMATCH"):
           - If Database = "Male": The comment must use ONLY male pronouns ("he", "him", "his"). Flag any presence of "she", "her", "hers".
           - If Database = "Female": The comment must use ONLY female pronouns ("she", "her", "hers"). Flag any presence of "he", "him", "his".
           - Flag immediately if pronouns flip-flop or drift mid-comment.

        3. GRAMMAR & MECHANICS (Type: "GRAMMAR"):
           - Flag lowercase sentence openings, missing trailing punctuation, or structural fragments.
           - Flag run-on sentences. Every comment must contain clean, short, distinct phrasing blocks.

        4. TONE, STYLE & CALIBRATION (Type: "TONE"):
           
           // AUDIT TARGET MODE: ${isGeneralCommentAudit ? "GENERAL CLASS COMMENT" : "SUBJECT / CLUB COMMENT"}
           
           ${isGeneralCommentAudit ? `
           - GENERAL COMMENT CLOSURE VERIFICATION: Check the final sentence against the student's academic profile:
             * If lowestSubjects is "ALL_EXCELLENT": Must close with pure celebration, praise, or future momentum. Flag if a parental action chore or "Please" assignment is present.
             * If lowestSubjects is empty "" (Steady Performer): Must close with an encouraging independent milestone or light motivational push for next term.
             * If lowestSubjects contains weak subjects (e.g., "Math and Science"): MUST close with a warm, direct parent-partnership appeal targeting home support or revision.
           ` : `
           - SUBJECT/CLUB COMMENT CLOSURE VERIFICATION: Check the final sentence against the raw score band:
             * High Achievers [80-100]: Must close with pure celebration or praise. Do NOT allow a parent action chore.
             * Average Performers [60-79]: Must close with an encouraging independent goal or motivational push.
             * Struggling Performers [0-59]: MUST close with a warm, direct parent-partnership appeal (e.g., "Kindly assist...", "Please support...").
           `}

           - DYNAMIC PARENT APPEAL FORMAT: For rows where a parental appeal is mandatory, flag it if it sounds cold or detached (e.g., "He must study harder."). It must address the parent directly and warmly.
           
           - STAFFROOM PEDAGOGY LOCALIZATION: Flag banned American or AI-centric terminology and enforce standard local alternatives:
             * Banned: "worksheets", "notebooks", "practice books", "computer/math topics", "reviewing".
             * Mandatory local replacements: "exercises", "exercise books", "classwork", "homework", "revision", "revising notes".
           
           - ADVERB POLLUTION CHECKS: Flag robotic AI over-writing where actions are heavily modified by "-ly" adverbs. Flag combinations like: "works sensibly", "cooperates nicely", "handles easily", "participates happily". Actions must be stated plainly and directly.
           
           - JARGON BAN: Flag complex corporate-academic or flowery vocabulary: exhibits, demonstrates, proficiency, mastery, aptitude, cognitive, pedagogical, competency, diligent, exemplary.
           
           - NO PEER TUTORING: Under no circumstances allow high-performing profiles to be tasked with tutoring, coaching, or explaining tasks to classmates. They must get direct praise for their own milestones only.

        OUTPUT FORMAT:
        Return ONLY a JSON Array of objects. No markdown blocks (\`\`\`).
        Return an object for EVERY input item.
        You MUST include the exact 'id' from the INPUT DATA in your output for each item. Do not skip any items.

        Example:
        [
          {
            "id": "row_col",
            "hasError": true,
            "errorType": "TONE",
            "feedback": "Banned AI term 'worksheets' detected. Use local pedagogical alternative 'exercises' instead."
          },
          {
            "id": "row_col_2",
            "hasError": false,
            "errorType": null,
            "feedback": "OK"
          }
        ]
        `;
    }
};