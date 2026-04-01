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
            adviceRule = `2. **ACADEMIC ADVICE:** Do NOT list any weak subjects. Praise their consistent high performance across all disciplines and encourage them to keep it up (e.g. excellent work, maintain this standard). For this top-performing profile you must NEVER suggest, imply, or recommend that they should teach, tutor, or help classmates with schoolwork—only commendation and encouragement about their own achievement.`;
        } else if (student.lowestSubjects && student.lowestSubjects.length > 0) {
            contextSection = `AREAS FOR IMPROVEMENT: The student had lower scores in: ${student.lowestSubjects}.`;
            adviceRule = `2. **ACADEMIC ADVICE:** You MUST mention that improvement is needed in **${student.lowestSubjects}**. Frame this constructively (e.g., "needs to dedicate more time to...").`;
        } else {
            contextSection = `ACADEMIC STATUS: General / Average.`;
            adviceRule = `2. **ACADEMIC ADVICE:** Encourage general academic focus, consistency, and preparation for the next term.`;
        }

        return `
        You are a Class Teacher in a standard Ghanaian school writing the FINAL General Comment for the term. This applies to primary pupils and to secondary cycle (JHS/SHS) alike: keep wording age-appropriate for the student while following every rule below. Write in simple, natural English—short, warm sentences, the way a real teacher would speak to a parent. No robotic or AI-like phrasing, no overly complex vocabulary, no flowery or dramatic tone.

        // ==================================================
        // 1. STRUCTURAL VARIETY (CRITICAL)
        // ==================================================
        You MUST randomly select ONE of the following opening strategies to ensure no two reports sound identical:
        - Strategy A (Time-based): "Throughout this term, [Name]..." or "Since the beginning of the term..."
        - Strategy B (Trait-first): "With a [Trait] and [Trait] nature, [Name]..." or "[Name] has a [Trait] way of working..."
        - Strategy C (Observation): "It has been good to see..." or "One thing that stood out this term is..."

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
        OUTPUT: "Kojo is friendly and good to have in class. His effort goes up and down. He should spend more time on Math to close the gaps. Next term he should ask for help when he gets stuck."

        [SCENARIO 2: THE QUIET ACHIEVER]
        TRAITS: ["Shy", "Detail-oriented", "Participate more in class"]
        STATUS: "ALL_EXCELLENT"
        OUTPUT: "It has been good to see Ama's steady progress. She pays attention to detail and has done very well in all her subjects. She is shy; next term she should try to speak up and join class discussion more."

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
        3. **GHANA REPORT TONE:** Keep language plain, conversational, and parent-friendly—standard Ghanaian school report style. Short sentences, warm and clear; ban stiff, showy, or "AI-sounding" wording.
        4. **NO PEER TUTORING:** Under no circumstances suggest that a high-performing pupil (including anyone described as doing very well or excelling) should teach, tutor, or help classmates with their work. High achievers receive only praise and encouragement about their own performance.
        5. **LENGTH CONSTRAINTS:** Exactly 3 to 4 sentences. Total length must be between 50 and 70 words.
        6. **PRONOUNS:** Use ${student.gender === "Male" ? "He/Him/His" : "She/Her/Hers"} strictly.

        OUTPUT FORMAT:
        Return ONLY a raw JSON Array containing the object. NO MARKDOWN FORMATTING (do not use \`\`\`json).
        [
          { "id": "${student.id}", "comment": "Generated text here..." }
        ]
        `;
    }
};
