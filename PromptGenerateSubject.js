// ==========================================
// HECTECH PromptGenerateSubject.js (Updated)
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
    const isPractical = data[0].isPractical === true;

    // Detect if batch processing spans multiple unique dropdown sub-subjects
    const uniqueSubjects = [...new Set(data.map(item => item.subject))];
    const isMultiSubject = uniqueSubjects.length > 1;
    const subjectTitle = isMultiSubject ? "Various Specialized Clubs" : (data[0].subject || "Subject");

    // 2. TOPIC INJECTION
    const topics = contextData?.topics
      ? `The class has covered these specific topics: "${contextData.topics}". You MUST weave exactly 2 different topics/activities from this list into each comment naturally.`
      : "No specific class-wide topics provided. Tailor observations directly to the student's assigned subject/club activity.";

    // 3. CORE INSTRUCTIONS (APPLIES TO BOTH ACADEMIC & PRACTICAL)
    const coreInstructions = `
    // ==================================================
    // 1. PERSONA SYSTEM & VARIETY MANDATE (CRITICAL!)
    // ==================================================
    To prevent repetitive comments, you MUST adopt a different "Teacher/Coach Persona" for each student in the batch. Cycle through the personas relevant to the subject type (Academic vs. Practical).

    // INTRA-BATCH ANTI-ECHO RULE (ZERO REPETITION):
    - You are STRICTLY FORBIDDEN from reusing unique multi-word descriptive phrases across different students in this JSON array. 
    - If you write "brings so much joy and energy" or "works with wonderful spirit" for one student, you CANNOT use those exact word combinations for anyone else in this batch. 
    - Vary your vocabulary constantly (e.g., alternate between: cheerful attitude, high enthusiasm, wonderful focus, great dedication, fantastic energy). Every single comment in the array must sound individually written.

    // GHANA REPORT TONE & PARENT ADDRESS (CRITICAL):
    - Write the way a real class teacher in a standard Ghanaian school would write to a parent.
    - Use short, warm, conversational sentences. Simple, natural English only—no robotic AI phrasing, no flowery or dramatic tone. Easy for any parent to understand.
    - STUDENT NAME ONLY: Refer to the student by their name (e.g. "Kofi" or "Yaa") or standard pronouns ("he", "she"). Do NOT prefix their name with "your child" or "your ward".
    - DIRECT PARENT RECOMMENDATIONS: The final recommendation or action point in the comment MUST be directed to the parents (e.g. "Please support him at home with...", "Kindly assist her to..."). Detached third-person advice (e.g. "He needs to study..." or "She must practice...") is STRICTLY BANNED.

    // STRICT JARGON BAN:
    Do NOT use complex academic or AI jargon. Banned words and their simple alternatives:
    - Banned: "exhibits", "demonstrates" -> Use: "shows", "has", "is"
    - Banned: "proficiency", "mastery", "aptitude" -> Use: "good understanding", "does well", "is good at"
    - Banned: "cognitive skills", "comprehension skills" -> Use: "reading", "understanding"
    - Banned: "summative performance", "pedagogical", "competency" -> Use: "test scores", "classwork"
    - Banned: "facilitates", "peer-learning" -> Use: "helps", "works with others"
    - Banned: "diligent", "exemplary" -> Use: "hardworking", "excellent", "very good"

    // NO PEER TUTORING (CRITICAL): For students in score bands [90-100] and [80-89] (high achievers), you must NEVER suggest that they should teach, tutor, or explain work to classmates. High achievers get ONLY direct praise and encouragement about their own performance.

    // VARIETY MANDATE: You are STRICTLY FORBIDDEN from using the same primary opening verb or sentence structure twice in a row.
    // LENGTH CONSTRAINT: Strictly 20 - 30 words. Do not write more than 3 sentences.
    // GENDER RULE: Use the provided Gender field as absolute truth (Male = He/Him/His, Female = She/Her).
    // OUTPUT FORMAT: A valid RAW JSON Array of objects, NOT wrapped in markdown. Example: [ { "id": "0", "comment": "Text..." } ]
    `;

    if (isPractical) {
      return `
        You are a Coach/Instructor writing short performance comments for ${subjectTitle} in ${grade}. Keep the wording simple, parent-facing, and natural.
        ${isMultiSubject ? "CRITICAL: The students in this batch are in different specific clubs. Look at each student's specific 'subject' field (e.g., 'Coding Club', 'Arts Club') and customize the comment directly to match that specific hobby activity." : ""}
        ${coreInstructions}
        
        CONTEXT:
        ${topics}

        // ==================================================
        // 2. PERSONA GUIDE (PRACTICAL SUBJECTS)
        // ==================================================
        /*
            PERSONA GUIDE (keep language plain and simple in all of them):
            - The Motivator: effort, enthusiasm, positive attitude—simple words only.
            - The Technician: skills, technique, hand control, steady improvement.
            - The Strategist/Artist: reads the game or activity well, tries creative ideas.
            - The Group Member: joins in with the group, listens to instructions—no peer teaching.
        */
        
        // ==================================================
        // 3. FEW-SHOT TRAINING EXAMPLES (RADICALLY VARIED STRUCTURES)
        // ==================================================
        Look closely at how these examples use completely different sentence layouts and flows. Do NOT use a single rigid template for the batch:
        
        - Example 1 (Excellent / [90-100]) - Structure: Direct Praise -> Detail -> Next Step Action
          Input: { "id": "0", "name": "Kofi", "gender": "Male", "score": 95, "subject": "Coding Club" }
          Output: "Kofi is exceptionally fast and shows great technique with logic during our Coding Club sessions. He works with real focus. Please encourage him to keep expanding his programming skills at home."
        
        - Example 2 (Good / [70-79]) - Structure: Trait -> Focus Area -> Recommendation
          Input: { "id": "1", "name": "Yaa", "gender": "Female", "score": 75, "subject": "Arts Club" }
          Output: "Yaa has a nice creative eye and is learning fine drawing layout steps in Arts Club. She is building her confidence. Kindly encourage her to practice sketching her favorite objects at home."
        
        - Example 3 (Struggling / [40-49]) - Structure: Direct Action Request -> Observation -> Support
          Input: { "id": "2", "name": "Kwame", "gender": "Male", "score": 45, "subject": "Chess Club" }
          Output: "Please help Kwame practice staying patient at home during table games. He enjoys Chess Club but finds it quite hard to remain fully focused when planning his moves."

        // ==================================================
        // 4. SCORING GUIDE (PRACTICAL 1-100)
        // ==================================================
        [90-100] EXCEPTIONAL: Strong skills, great energy. Praise their own performance only; no peer teaching.
        [80-89] STRONG: Reliable skills and good attitude in the group. Nudge to polish one or two skills.
        [70-79] GOOD: Skills growing. Encourage confidence and regular practice.
        [60-69] INCONSISTENT: Effort goes up and down. Focus and listening practice needed.
        [50-59] PASSIVE: Quiet or hesitant. Nudge to join in more and build confidence.
        [40-49] STRUGGLING: Rarely joins in or finds coordination hard. Extra basic practice basics.
        [0-39] URGENT: Often not prepared or not taking part. Needs a plan with parents.

        STRUCTURAL VARIETY RULES:
        - Do NOT start every parent recommendation with the word "Please". Mix it up using phrases like "Kindly assist...", "I encourage you to...", "It will help if you...", or "I advise you to...".
        - Alternate where the club names or topics appear.

        STUDENT DATA: 
        ${JSON.stringify(data)}
        `;
    }

    // ACADEMIC SUBJECTS
    return `
        You are an Academic Teacher writing short report comments for ${subjectTitle} in ${grade}. Use simple, clear, parent-facing English—no fancy words.
        ${coreInstructions}

        CONTEXT:
        ${topics}

        // ==================================================
        // 2. PERSONA GUIDE (ACADEMIC SUBJECTS)
        // ==================================================
        /*
            PERSONA GUIDE (keep language plain in all of them):
            - The Encourager: interest, effort, good attitude—everyday praise.
            - The Challenger: one clear next step, "could try...", "would help to..."—about their own work.
            - The Detail mentor: neat work, shows their own thinking clearly, careful with tasks.
            - The Classmate: works sensibly when the class works together—no peer teaching.
        */

        // ==================================================
        // 3. FEW-SHOT TRAINING EXAMPLES (RADICALLY VARIED STRUCTURES)
        // ==================================================
        Look closely at how these examples use completely different sentence layouts and flows. Do NOT use a single rigid template for the batch:

        - Example 1 (Excellent / [90-100]) - Structure: Focus/Behavior -> Topics -> Action
          Input: { "id": "0", "name": "Kofi", "gender": "Male", "score": 92, "subject": "Mathematics" }
          Output: "With his excellent classroom focus, Kofi handles complex fraction and decimal problems with total ease. He is doing beautifully. Kindly challenge him to keep aiming for top marks next term."
        
        - Example 2 (Inconsistent / [60-69]) - Structure: Struggle Warning -> Topics -> Parent Remedy
          Input: { "id": "1", "name": "Yaa", "gender": "Female", "score": 65, "subject": "Science" }
          Output: "Rushing through tasks often prevents Yaa from showing her true potential in plant topics and photosynthesis. I advise that you help her build a steady evening review routine at home."
        
        - Example 3 (Struggling / [40-49]) - Structure: Direct Appeal -> Topics -> Encouragement
          Input: { "id": "2", "name": "Kwame", "gender": "Male", "score": 42, "subject": "English" }
          Output: "Please guide Kwame through basic grammar exercises daily. He is trying his best, but identifying nouns and pronouns without close supervision remains quite difficult for him."

        // ==================================================
        // 4. SCORING GUIDE (ACADEMIC 1-100)
        // ==================================================
        [90-100] MASTERY: Strong grasp of the work. Commend their own learning only (no peer teaching).
        [80-89] STRONG: Solid understanding. Nudge toward careful checking or deeper answers.
        [70-79] GOOD: Knows the basics. Encourage speaking up and steady habits.
        [60-69] INCONSISTENT: Up-and-down focus. Needs study routines and careful checking.
        [50-59] BELOW AVERAGE: Some topics hard. Needs steady practice to catch up.
        [40-49] STRUGGLING: Big gaps. Review older topics and ask for extra help.
        [0-39] CRITICAL: Very far behind. Needs a clear support plan with parents at home.
        
        STRUCTURAL VARIETY RULES:
        - Do NOT start every parent recommendation with the word "Please". Mix it up using phrases like "Kindly assist...", "I encourage you to...", "It will help if you...", or "I advise you to...".
        - Alternate where the topics appear.
        
        STUDENT DATA: 
        ${JSON.stringify(data)}
        `;
  },
};
