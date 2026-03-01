// ==========================================
// HECKTECK PromptGenerateGeneral.js
// ==========================================

const PromptGenerateGeneral = {

    /**
     * PROMPT: Generate General Class Comment
     * Merges "Smart Context Logic" with "10-Scenario Training"
     * 
     * @param {Array} data - List containing student object with { name, gender, traits, lowestSubjects, etc. }
     */
    getGeneralCommentPrompt: (data) => {
        const student = data[0];
        
        // 1. ANALYZE ACADEMIC CONTEXT
        // "ALL_EXCELLENT" is a special flag from GeneralCommentsManager if all academic scores > 80
        const isAllExcellent = (student.lowestSubjects === "ALL_EXCELLENT");
        
        let contextSection = "";
        let adviceRule = "";

        // 🟢 DUAL-MODE LOGIC
        if (isAllExcellent) {
            // Mode A: High Achiever (No weak subjects)
            contextSection = `ACADEMIC STATUS: SUPERIOR. This student scored 80+ (Grade A) in ALL academic subjects.`;
            adviceRule = `2. ACADEMIC ADVICE: Do NOT list any weak subjects. Instead, praise their consistent high performance across all disciplines and encourage them to keep it up.`;
        } else if (student.lowestSubjects) {
            // Mode B: Needs Improvement
            contextSection = `AREAS FOR IMPROVEMENT: The student had lower scores in: ${student.lowestSubjects}.`;
            adviceRule = `2. ACADEMIC ADVICE: You MUST mention that improvement is needed in **${student.lowestSubjects}**. Frame this constructively (e.g., "needs to focus on...", "requires more effort in...").`;
        } else {
            // Mode C: Safe Fallback
            contextSection = `ACADEMIC STATUS: General / Average.`;
            adviceRule = `2. ACADEMIC ADVICE: Encourage general academic focus and consistency.`;
        }

        return `
        You are an experienced Class Teacher writing the FINAL General Comment for the term.
        
        // ==================================================
        // 1. CRITICAL RULE: SENTENCE VARIETY
        // ==================================================
        🚫 DO NOT always start with "${student.name} is a..."
        ✅ MIX IT UP: Start with a time phrase ("Throughout the term..."), a trait ("With a quiet nature..."), or an observation ("It has been a pleasure...").

        // ==================================================
        // 2. TRAINING EXAMPLES (MIMIC THESE STYLES)
        // ==================================================

        [SCENARIO 1: THE HIGH ACHIEVER]
        TRAITS: [Respectful, Hardworking, Leader]
        STATUS: "ALL_EXCELLENT"
        OUTPUT: "Throughout this term, Kwame has demonstrated exemplary conduct and natural leadership. He approaches every task with maturity. Academically, he has been outstanding across the board. He is encouraged to maintain this high standard of excellence."

        [SCENARIO 2: THE QUIET ACHIEVER]
        TRAITS: [Shy, Polite, Detail-oriented]
        IMPROVEMENT: "Math and Science"
        OUTPUT: "It has been a pleasure observing Ama's quiet but steady progress. She is a polite student who pays great attention to detail. However, she needs to dedicate more time to Math and Science to boost her overall average."

        [SCENARIO 3: THE SOCIAL BUT DISTRACTED]
        TRAITS: [Friendly, Talkative, Distracted]
        IMPROVEMENT: "English and History"
        OUTPUT: "With a friendly and outgoing nature, Kojo is a popular member of the class, though his talkativeness often distracts him. He tends to rush his work. He must focus on English and History to bridge the gaps in his learning."

        [SCENARIO 4: THE STRUGGLING BUT TRYING]
        TRAITS: [Hardworking, Anxious, Polite]
        IMPROVEMENT: "Math"
        OUTPUT: "Determined describes Efua's approach to her studies this term. Despite finding some concepts challenging, she puts in great effort. She is polite but requires supervision. Continued practice in Math is essential for her growth."

        [SCENARIO 5: THE DISRUPTIVE STUDENT]
        TRAITS: [Disruptive, Inconsistent]
        IMPROVEMENT: "Science"
        OUTPUT: "Regarding his behavior, Kofi has been a concern this term due to his disruptive nature. His effort has been inconsistent at best. He needs to strictly adhere to rules and focus on Science to improve his standing next term."

        [SCENARIO 6: THE CREATIVE TYPE]
        TRAITS: [Creative, Messy, Energetic]
        IMPROVEMENT: "Computing"
        OUTPUT: "Full of energy and bright ideas, Yaw brings a creative spark to the classroom. However, his organization needs improvement as his work is often untidy. He is encouraged to take more care in his presentation, particularly in Computing."

        [SCENARIO 7: THE IMPROVING STUDENT]
        TRAITS: [Improving, Motivated, Happy]
        IMPROVEMENT: "English"
        OUTPUT: "Since the beginning of the term, Ebo has shown a remarkable improvement in his attitude. He comes to school happy and ready to learn. He is encouraged to keep up this momentum and pay closer attention to his English vocabulary."

        // ==================================================
        // 3. YOUR TASK
        // ==================================================

        INPUT DATA:
        Student: ${student.name} (${student.gender})
        Selected Traits: ${JSON.stringify(student.traits)}
        ${contextSection}
        
        TASK:
        Write a holistic paragraph combining the selected traits and the academic advice.
        
        STRICT GUIDELINES:
        1. **TRAITS:** Weave 2-3 traits into the narrative naturally. Do not just list them.
        ${adviceRule}
        3. **LENGTH:** Strictly 300 - 450 characters including spaces (approx 50-70 words). STRICLTY DO NOT EXCEED 450 CHARACTERS INCLUDING SPACES!
           - Too short? Add specific behavioral advice.
           - Too long? Remove adjectives.
        4. **GENDER:** Use ${student.gender === "Male" ? "He/Him/His" : "She/Her/Hers"} strictly.
        
        OUTPUT FORMAT:
        Return ONLY a JSON Array containing the object:
        [
          { "id": "${student.id}", "comment": "Generated text here..." }
        ]
        `;
    }
};
