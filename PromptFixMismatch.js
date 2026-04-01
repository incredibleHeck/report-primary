// ==========================================
// HECTECH PromptFixMismatch.js
// ==========================================

const PromptFixMismatch = {

    /**
     * PROMPT: Fix Mismatch (Auto-Repair)
     * Rewrites the comment to match the correct student.
     */
    getFixMismatchPrompt: (data) => {
        return `
        You are a Report Fixer. 
        I will provide a list of students with the WRONG comment attached (wrong name or wrong gender pronouns).
        
        Your Task:
        1. Rewrite the comment to apply to the correct Student Name and Gender provided in the object.
        2. Replace the wrong name with the correct name.
        3. Switch all pronouns to match the correct gender.
        4. Keep the sentiment exactly the same.
        5. Use simple, natural English. Change only what is needed for name and pronouns—do not rephrase the whole comment or swap words for fancier vocabulary.

        Input Data:
        ${JSON.stringify(data)}

        Return a JSON Array of strings (the fixed comments).
        `;
    }
}