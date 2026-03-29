// ==========================================
// HECTECH PromptGenerateGeneral.js
// ==========================================

const PromptGenerateGeneral = {

    /**
     * PROMPT: Generate General Class Comment
     * Merges "Smart Context Logic", "Few-Shot Training", and "Trait Synthesis"
     * 
     * @param {Array} data - List containing student object with { name, gender, traits, lowestSubjects, etc. }
     */
    getGeneralCommentPrompt: (data) => {
        const student = data[0];
        
        // 1. ANALYZE ACADEMIC CONTEXT
        const isAllExcellent = (student.lowestSubjects === "ALL_EXCELLENT");
        
        let contextSection = "";
        let adviceRule = "";

        if (isAllExcellent) {
            contextSection = `ACADEMIC STATUS: SUPERIOR. This student scored 80+ (Grade A) in ALL academic subjects.`;
            adviceRule = `2. ACADEMIC ADVICE: Do NOT list any weak subjects. Praise their consistent high performance across all disciplines and encourage them to keep it up.`;
        } else if (student.lowestSubjects && student.lowestSubjects.length > 0) {
            contextSection = `AREAS FOR IMPROVEMENT: The student had lower scores in: ${student.lowestSubjects}.`;
            adviceRule = `2. ACADEMIC ADVICE: You MUST mention that improvement is needed in **${student.lowestSubjects}**. Frame this constructively (e.g., "needs to dedicate more time to...").`;
        } else {
            contextSection = `ACADEMIC STATUS: General / Average.`;
            adviceRule = `2. ACADEMIC ADVICE: Encourage general academic focus, consistency, and preparation for the next term.`;
        }

        return `
        You are an experienced Class Teacher writing the FINAL General Comment for the term.
        
        // ==================================================
        // 1. STRUCTURAL VARIETY (CRITICAL)
        // ==================================================
        You MUST randomly select ONE of the following opening strategies to ensure no two reports sound identical:
        - Strategy A (Time-based): "Throughout this term, [Name]..." or "Since the beginning of the term..."
        - Strategy B (Trait-first): "With a [Trait] and [Trait] nature, [Name]..." or "Characterized by his/her [Trait] approach..."
        - Strategy C (Observation): "It has been a pleasure to observe..." or "A standout aspect of [Name]'s term has been..."

        // ==================================================
        // 2. TRAIT SYNTHESIS LOGIC (HANDLING MIXED TRAITS)
        // ==================================================
        Teachers will select diverse combinations of traits. You MUST weave them together logically:
        - CONTRADICTORY TRAITS (e.g., "Creative" + "Disruptive"): Use contrast words. Example: "While [Name] is highly creative, he can occasionally be disruptive."
        - COMPLEMENTARY TRAITS (e.g., "Polite" + "Hardworking"): Use compounding words. Example: "Not only is she polite, but she is also a hardworking student."
        - ACTIONABLE GOALS (e.g., "Check work for errors", "Read more widely"): If any selected trait is an instruction/goal rather than an adjective, you MUST place it at the end of the paragraph as advice for next term.

        // ==================================================
        // 3. TRAINING EXAMPLES
        // ==================================================

        [SCENARIO 1: MIXED TRAITS]
        TRAITS: ["Friendly", "Inconsistent effort", "Ask for help when stuck"]
        IMPROVEMENT: "Math"
        OUTPUT: "With a friendly nature, Kojo is a joy to have in class. However, his effort can be inconsistent. He needs to dedicate more time to Math to bridge the gaps in his learning. Moving forward, he is highly encouraged to ask for help when stuck."

        [SCENARIO 2: THE QUIET ACHIEVER]
        TRAITS: ["Shy", "Detail-oriented", "Participate more in class"]
        STATUS: "ALL_EXCELLENT"
        OUTPUT: "It has been a pleasure observing Ama's steady progress. She is a detail-oriented student whose academic performance has been outstanding across the board. To elevate her presence next term, she is encouraged to overcome her shy nature and participate more in class."

        // ==================================================
        // 4. YOUR TASK
        // ==================================================

        INPUT DATA:
        Student: ${student.name}
        Gender: ${student.gender}
        Selected Traits: ${JSON.stringify(student.traits)}
        ${contextSection}
        
        STRICT GUIDELINES:
        1. **TRAITS:** Weave the selected traits into the narrative using the Trait Synthesis Logic. DO NOT just list them separated by commas.
        ${adviceRule}
        3. **LENGTH CONSTRAINTS:** Exactly 3 to 4 sentences. Total length must be between 50 and 70 words.
        4. **PRONOUNS:** Use ${student.gender === "Male" ? "He/Him/His" : "She/Her/Hers"} strictly.
        
        OUTPUT FORMAT:
        Return ONLY a raw JSON Array containing the object. NO MARKDOWN FORMATTING (do not use \`\`\`json).
        [
          { "id": "${student.id}", "comment": "Generated text here..." }
        ]
        `;
    }
};
