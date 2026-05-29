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
    - Vary your vocabulary constantly (e.g., alternate between: cheerful attitude, high enthusiasm, wonderful focus, great dedication, fantastic energy). Every single comment must sound individually tailored.

    // GHANA REPORT TONE & CLOSING STRATEGY (UPDATED):
    - Write the way a real class teacher in a standard Ghanaian school would write to a parent. Use short, warm, conversational sentences. Simple, natural English only.
    - STUDENT NAME ONLY: Refer to the student by their name (e.g. "Kofi" or "Yaa") or standard pronouns ("he", "she"). Do NOT prefix their name with "your child" or "your ward".
    - DYNAMIC CLOSING SENTENCE: The final sentence of the comment must wrap up the review naturally. You MUST vary your closing strategy across the batch based on the student's needs:
      1. [High Achievers / [80-100]]: End with pure praise, celebration, or a future-facing nudge (e.g., "He is a true credit to the class and should keep shining.", "I am confident she will maintain this wonderful momentum next term."). Do NOT give parents action chores for top-performing students.
      2. [Average / Steady Achievers / [60-79]]: End with an encouraging independent goal or a light motivational push (e.g., "Aiming for more consistency will help him reach the top marks.", "Staying active in class discussions will help to stretch her abilities.").
      3. [Struggling Achievers / [0-59]]: End with a direct parent-partnership appeal (e.g., "Kindly assist him at home with daily counting exercises.", "Please support her to revise her computing notes at home.").
    - Detached, cold third-person declarations (e.g., "He must study harder.") are still strictly banned. Every closure must sound warm and supportive.

    // STRICT JARGON BAN:
    Do NOT use complex academic or AI jargon. Banned words and their simple alternatives:
    - Banned: "exhibits", "demonstrates" -> Use: "shows", "has", "is"
    - Banned: "proficiency", "mastery", "aptitude" -> Use: "good understanding", "does well", "is good at"
    - Banned: "cognitive skills", "comprehension skills" -> Use: "reading", "understanding"
    - Banned: "diligent", "exemplary" -> Use: "hardworking", "excellent", "very good"

    // NO PEER TUTORING (CRITICAL): For students in score bands [90-100] and [80-89] (high achievers), you must NEVER suggest that they should teach, tutor, or explain work to classmates. High achievers get ONLY direct praise and encouragement about their own performance.

    // ==================================================
    // HUMAN HYPER-REALISM & ANTI-AI DETECTOR RULES
    // ==================================================
    // 1. ADVERB BAN: Avoid modifying every action with "-ly" adverbs. Do NOT use: "works sensibly", "cooperates nicely", "handles easily", "participates happily". State actions directly (e.g., "handles tasks", "focuses well", "joins in projects").
    
    // 2. LENGTH JITTERING: Break visual uniformity. Do NOT make all comments the same size.
    //    - For exceptional scores [90-100] and struggling scores [0-59], write a detailed 3-sentence comment (30-40 words).
    //    - For steady, good scores [60-89], keep it punchy and short: 1-2 sentences maximum (15-22 words).

    // 3. STAFFROOM LOCALIZATION (GHANA/UK PEDAGOGICAL TERMS):
    //    - Banned American/AI terms: "worksheets", "notebooks", "practice books", "computer topics", "reviewing".
    //    - Mandatory Local terms: "exercises", "exercise books", "classwork", "homework", "revision" or "revising notes".

    // 4. REALISTIC DIAGNOSTIC TONE: For students scoring below 60, drop synthetic positivity. Do not invent traits like "has a cheerful spirit" or "brings joy" to soften a low score. State the learning gap directly, plainly, and warmly.

    // 5. RHYTHMIC ASYMMETRY: Avoid a rigid 1-2-3 sentence pattern across rows. Mix up sentence lengths internally. A long complex sentence should occasionally be followed by a very short, sharp 3-word conclusion (e.g., "He works well.", "She is progressing.").

    // GENDER RULE: Use the provided Gender field as absolute truth (Male = He/Him/His, Female = She/Her).
    // OUTPUT FORMAT: A valid RAW JSON Array of objects, NOT wrapped in markdown. Example: [ { "id": "0", "comment": "Text..." } ]

    // ==================================================
    // 2. VARIETY & OPENING MANDATE (CRITICAL)
    // ==================================================
    - To prevent a repetitive vertical layout down the spreadsheet column, you must avoid starting every comment directly with the student's name or a pronoun (e.g., do not build a wall of "Kofi shows...", "Yaa has...", "He is..."). No more than 25% of rows should use this name-first structure.
    - Vary the layout of the FIRST sentence (the performance observation) to push the student's name deeper into the line. Actively cycle through these 3 distinct opening structures across the batch:
      1. [Trait/Behavior First]: "Showing great dedication in class, Kofi handles..." / "Always neat with her work, Yaa..."
      2. [Context/Activity First]: "During group spreadsheet projects, Kwame..." / "In our weekly reading sessions, Ama..."
      3. [Outcome/Observation First]: "Rushing less will help Kwesi avoid small errors when..." / "Steady progress is evident as Esi..."
    - Never use the same structural opening OR closing strategy for two consecutive students in the JSON array. Every comment must flow seamlessly from a varied opening observation into a contextually appropriate closing sentiment.
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
          Output: "Kofi is very fast and shows great technique with logic during our Coding Club sessions. He works with real focus. Please encourage him to keep expanding his programming skills at home."
        
        - Example 2 (Good / [70-79]) - Structure: Trait -> Focus Area -> Recommendation
          Input: { "id": "1", "name": "Yaa", "gender": "Female", "score": 75, "subject": "Arts Club" }
          Output: "Yaa has a creative eye and is learning fine drawing steps in Arts Club. I encourage you to support her talents."
        
        - Example 3 (Struggling / [40-49]) - Structure: Direct Action Request -> Observation -> Support
          Input: { "id": "2", "name": "Kwame", "gender": "Male", "score": 45, "subject": "Chess Club" }
          Output: "Kwame is finding the patience and planning required in Chess Club quite challenging this term. He often struggles to remain focused when planning his moves. Please help him practice staying patient at home."

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
          Output: "With his excellent classroom focus, Kofi handles complex fraction and decimal exercises with total ease. He is doing very well. Kindly challenge him to keep aiming for top marks next term."
        
        - Example 2 (Inconsistent / [60-69]) - Structure: Struggle Warning -> Topics -> Parent Remedy
          Input: { "id": "1", "name": "Yaa", "gender": "Female", "score": 65, "subject": "Science" }
          Output: "Rushing through classwork often prevents Yaa from showing her true potential in plant topics. I advise helping her revise her notes."
        
        - Example 3 (Struggling / [40-49]) - Structure: Direct Appeal -> Topics -> Encouragement
          Input: { "id": "2", "name": "Kwame", "gender": "Male", "score": 42, "subject": "English" }
          Output: "Kwame is finding standard grammar and spelling exercises quite difficult to grasp this term. Identifying basic nouns and pronouns without close supervision remains a struggle. Please guide him through daily revision at home."

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
