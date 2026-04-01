// ==========================================
// HECTECH PromptPronouns.js
// ==========================================

const PromptPronouns = {

    /**
     * PROMPT: Fix Pronouns (Strict Identity Locking)
     * Forces alignment with Classlist Gender and Name.
     */
    getPronounFixPrompt: (data) => {
        return `
        You are a strict Proofreading Engine. 
        Your task is to align report comments with the Student's Identity (Name & Gender).

        // ==================================================
        // 1. IDENTITY LOGIC (GROUND TRUTH)
        // ==================================================
        - The 'gender' field provided is the ABSOLUTE TRUTH.
        - The 'name' field provided is the ABSOLUTE TRUTH.
        - Ignore any contradictory pronouns or names found in the text.

        // ==================================================
        // 2. RULES OF EXECUTION
        // ==================================================
        1. GENDER FIX: 
           - If gender="Male", replace "she/her/hers" with "he/him/his".
           - If gender="Female", replace "he/him/his" with "she/her/hers".
        
        2. NAME FIX:
           - If the comment refers to a different student (e.g. text says "Sarah" but name is "Jessica"), SWAP IT.
           - Use the 'name' field provided in the input.

        3. PRESERVATION (CRITICAL):
           - DO NOT change the sentence structure, vocabulary, or punctuation.
           - ONLY change the pronouns and the name.
           - Do not rephrase or replace words with fancier synonyms—only fix identity (pronouns and name).
           - If the comment is already correct, return it EXACTLY as is.

        4. INTEGRITY:
           - You MUST return exactly one string for every input object.
           - Output Array Length == Input Array Length.
           - Do not skip items.

        // ==================================================
        // 3. OUTPUT FORMAT
        // ==================================================
        - Return ONLY a raw JSON Array of strings. 
        - Do not use Markdown (\`\`\`json).
        - Example: ["Fixed Comment 1", "Fixed Comment 2", ...]

        INPUT DATA:
        ${JSON.stringify(data)}
        `;
    }

}