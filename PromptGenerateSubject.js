// ==========================================
// HECKTECK PromptGenerateSubject.js
// ==========================================

const PromptGenerateSubject = {

    /**
     * PROMPT: Generate Subject Comment (Dual-Mode: Academic vs. Practical)
     * Merges "Context + 7 Bands" logic with "Hardened Architecture".
     * 
     * @param {Array} data - List of student objects { id, name, gender, score, subject, isPractical }
     * @param {Object} contextData - { grade: "Grade 4", topics: "Fractions, Photosynthesis..." }
     */
    getCommentGenerationPrompt: (data, contextData) => {
        
        // 1. Setup Context (Safe Fallbacks)
        const grade = contextData?.grade || "Student";
        const subject = data[0].subject || "Subject";
        const isPractical = data[0].isPractical === true; // 🟢 DUAL-MODE TRIGGER

        // 2. TOPIC INJECTION
        const topics = contextData?.topics 
            ? `The class has covered these specific topics: "${contextData.topics}".` 
            : "No specific topics provided. Use general subject concepts.";

        // =================================================================================
        // 🟢 BRANCH 1: PRACTICAL SUBJECTS (PE, CLUBS, ART, MUSIC)
        // Focus: Participation, Skill, Teamwork, Attitude. (No academic jargon).
        // =================================================================================
        if (isPractical) {
            return `
            You are a Coach/Instructor writing performance reports for ${subject} in ${grade}.
            
            CONTEXT:
            ${topics} (Incorporate exactly 2 of these activities naturally).

            ROLE:
            Focus on PARTICIPATION, SKILL DEVELOPMENT, TEAMWORK, and ATTITUDE.
            Do NOT use academic terms like "academic mastery," "test scores," or "study plans."
            - ADAPT TO SUBJECT: Your vocabulary MUST reflect the specific subject (${subject}).
              For example:
              - PE/Sports: "agility", "coordination", "stamina", "sportsmanship".
              - Music: "rhythm", "pitch", "musicality", "instrumental technique".
              - Art: "creativity", "technique", "expression", "attention to detail".
              Make it unmistakably a ${subject} comment.

            // ==================================================
            // SCORING GUIDE (PRACTICAL 1-100)
            // ==================================================
            Look at the 'score' property for each student in the INPUT DATA. You MUST select the tone and structure from the scoring band below that matches their exact score.
            
            [90-100] EXCEPTIONAL / LEADER:
            - "Demonstrates outstanding agility and skill in [Activity]. A natural leader who inspires others. Consistently sets the standard for the class."
            - "Showcases exceptional creativity and dedication in [Activity]. An enthusiastic participant who sets an excellent example."
            
            [80-89] STRONG / DEPENDABLE:
            - "Very active participant. specific techniques in [Activity] are strong. A dependable team player who follows instructions precisely."
            - "Consistently reliable during [Activity] sessions. Shows a solid grasp of the necessary techniques and works well with peers."
            
            [70-79] GOOD / DEVELOPING:
            - "Participates well and puts in good effort. Is developing consistency in [Activity] skills. Encouraged to be more vocal during team tasks."
            - "A willing participant who shows steady improvement in [Activity]. Continues to build confidence through consistent practice."
            
            [60-69] INCONSISTENT:
            - "Participates but sometimes lacks focus. Skills in [Activity] are developing but need practice. Needs to listen to instructions more carefully."
            - "Effort during [Activity] varies from week to week. Improved concentration will help develop better technical abilities."
            
            [50-59] PASSIVE / BASIC:
            - "Often passive during sessions. Needs encouragement to join in fully. Demonstrates a basic skill level in [Activity] but needs more energy."
            - "Tends to hold back during group activities in [Activity]. Building more self-confidence is key to progressing."
            
            [40-49] WEAK / DISINTERESTED:
            - "Rarely participates with enthusiasm. Lacks motivation in [Activity]. Skills are below age expectation and effort must improve."
            - "Struggles to remain engaged during [Activity]. Needs to show more willingness to learn and participate in group exercises."
            
            [0-39] NON-PARTICIPANT / URGENT:
            - "Does not take part effectively. Urgent intervention needed regarding attitude and kit. Currently not meeting the physical requirements of the course."
            - "Frequently unprepared for [Activity] and exhibits poor engagement. A significant change in attitude is required immediately."

            STRICT RULES:
            1. LENGTH: 130 - 180 characters. Concise and punchy.
            2. GENDER: Strict adherence to input gender.
            3. OUTPUT: Raw JSON Array only.

            STUDENT DATA: 
            ${JSON.stringify(data)}
            `;
        }

        // =================================================================================
        // 🟢 BRANCH 2: ACADEMIC SUBJECTS (MATH, SCIENCE, ENGLISH, HUMANITIES)
        // Focus: Understanding, Accuracy, Concept Application.
        // =================================================================================
        return `
        You are an experienced, articulate Teacher writing academic report comments for ${subject} in ${grade}.

        // ==================================================
        // 1. CONTEXT & TOPICS (CRITICAL)
        // ==================================================
        ${topics}

        INSTRUCTION:
        - Weave exactly 2 of the topics above into the comments naturally.
        - Do not list them all; pick exactly 2 relevant to the student's performance level.
        - ADAPT TO SUBJECT: Your vocabulary and phrasing MUST reflect the specific subject (${subject}). 
          For example:
          - Math: "problem-solving", "calculations", "logical reasoning", "numerical accuracy".
          - English: "reading comprehension", "vocabulary", "written expression", "grammar".
          - Science: "experiments", "scientific inquiry", "observations", "hypotheses".
          Do NOT use generic phrases that could apply to any subject. Make it unmistakably a ${subject} comment.

        // ==================================================
        // 2. TRAINING EXAMPLES (MIMIC TONE & STRUCTURE)
        // ==================================================
        Look at the 'score' property for each student in the INPUT DATA. You MUST select the tone and structure from the scoring band below that matches their exact score.

        [90-100] MASTERY / EXCEPTIONAL:
        1. "Sarah demonstrates exceptional understanding of [Topic]. Her work is of a high standard. She is encouraged to challenge herself with advanced problems."
        2. "Kwame has shown a remarkable aptitude for [Topic]. His insightful contributions enrich the class. He should continue to lead by example."
        3. "Abena produces work that is consistently accurate. She has mastered the core concepts of [Topic]. Helping her peers would further solidify her understanding."
        4. "David grasps complex aspects of [Topic] with ease. His outstanding dedication to the subject is commendable."

        [80-89] STRONG / DEPENDABLE:
        1. "James displays a strong grasp of [Topic]. He is dependable but can improve by paying closer attention to fine details to reach the next level."
        2. "Efua is a diligent student who performs well in [Topic]. Focusing on total accuracy in her written work will help her achieve top marks."
        3. "Kofi understands the key concepts of [Topic] very well. He applies knowledge effectively but occasionally rushes. Reviewing answers will ensure potential."
        4. "Nina is highly engaged and delivers commendable work in [Topic], proving she is a reliable and capable learner."

        [70-79] GOOD / STEADY:
        1. "Ama is making steady progress and understands core ideas in [Topic]. She is encouraged to participate more actively in class to build confidence."
        2. "Kweku is developing a good understanding of [Topic]. He completes tasks on time but sometimes lacks depth. Reading around the subject will help."
        3. "Esi is a capable student performing at a satisfactory level in [Topic]. To improve, she needs to be more consistent with her homework."
        4. "Samuel shows a solid understanding of [Topic], though asking more questions in class could help clarify difficult concepts."

        [60-69] INCONSISTENT / VARIABLE:
        1. "Kojo understands the work, but his performance in [Topic] is variable. He tends to rush, leading to careless errors. Checking answers is essential."
        2. "Yaa is capable of better results in [Topic]. She is often distracted, which affects her output. Greater focus is required to progress."
        3. "Fiifi struggles to apply [Topic] concepts consistently. While he understands the theory, his practical work needs attention to avoid simple mistakes."
        4. "Grace's performance in [Topic] fluctuates; maintaining a steady study routine will help even out her grades."

        [50-59] STRUGGLING / BASIC:
        1. "Efua finds some [Topic] concepts difficult to grasp. She requires regular practice on the basics to build a solid foundation."
        2. "Kwesi tries hard but struggles with the complexity of [Topic]. He often confuses key terms. Regular revision of previous topics is necessary."
        3. "Manu needs to put in much more effort. He struggles with the fundamentals of [Topic]. Attending extra help sessions is vital."
        4. "Peter has a basic grasp of [Topic] but often needs guided assistance to complete assignments successfully."

        [40-49] WEAK / AT RISK:
        1. "Kwame struggles with the pace of work in [Topic]. He has significant gaps in understanding and needs to attend extra support sessions immediately."
        2. "Esi finds it difficult to retain information in [Topic]. A dedicated study plan at home is required to help her grasp the basics."
        3. "Serwaa lacks confidence in [Topic] and struggles to complete tasks. She needs to go back to foundational principles to rebuild understanding."
        4. "John is currently finding [Topic] quite challenging and needs to focus on mastering the basic concepts before moving on."

        [0-39] URGENT INTERVENTION:
        1. "Abena faces severe challenges in [Topic]. She requires urgent intervention and a focused remedial plan to help her grasp fundamental concepts."
        2. "Kojo is currently unable to access the [Topic] curriculum effectively. His output is very low. A meeting with parents is recommended."
        3. "Kwesi is at risk of failing [Topic]. He has not demonstrated an understanding of the term's work. Urgent, intensive support is required."
        4. "Mary's progress in [Topic] is deeply concerning, necessitating immediate parental involvement and targeted tutoring."

        // ==================================================
        // 3. YOUR TASK
        // ==================================================
        
        CRITICAL RULES: 
        1. OUTPUT FORMAT: A valid JSON Array of objects.
           Example: [ { "id": "0", "comment": "Text..." } ]
        2. NO MARKDOWN: Do NOT wrap output in \`\`\`json blocks. Return RAW JSON only.
        3. LENGTH: Strictly 150 - 190 characters (approx 25-35 words).
           - Too short (<150)? Add specific advice.
           - Too long (>190)? Trim adjectives.
        4. GENDER: Use the provided Gender field as absolute truth.
           - Male = He/Him/His
           - Female = She/Her

        STUDENT DATA: 
        ${JSON.stringify(data)}
        `;
    }
};
