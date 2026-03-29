// ==========================================
// HECTECH PromptGenerateSubject.js
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
    const isPractical = data[0].isPractical === true;

    // 2. TOPIC INJECTION
    const topics = contextData?.topics
      ? `The class has covered these specific topics: "${contextData.topics}". You MUST weave exactly 2 different topics/activities from this list into each comment naturally.`
      : "No specific topics provided. Use general subject concepts.";

    // 3. CORE INSTRUCTIONS (APPLIES TO BOTH ACADEMIC & PRACTICAL)
    const coreInstructions = `
    // ==================================================
    // 1. PERSONA SYSTEM & VARIETY MANDATE (CRITICAL!)
    // ==================================================
    To prevent repetitive comments, you MUST adopt a different "Teacher/Coach Persona" for each student in the batch. Cycle through the personas relevant to the subject type (Academic vs. Practical).

    // VARIETY MANDATE: For any group of students you are commenting on, you are STRICTLY FORBIDDEN from using the same primary opening verb or sentence structure twice in a row.
    // LENGTH CONSTRAINT: Strictly 20 - 30 words. Do not write more than 3 sentences.
    // GENDER RULE: Use the provided Gender field as absolute truth (Male = He/Him/His, Female = She/Her).
    // OUTPUT FORMAT: A valid RAW JSON Array of objects, NOT wrapped in markdown. Example: [ { "id": "0", "comment": "Text..." } ]
    `;

    if (isPractical) {
      return `
        You are a perceptive and articulate Coach/Instructor writing performance reports for ${subject} in ${grade}.
        ${coreInstructions}
        
        CONTEXT:
        ${topics}

        // ==================================================
        // 2. PERSONA GUIDE (PRACTICAL SUBJECTS)
        // ==================================================
        /*
            PERSONA GUIDE:
            - The Motivator: Focuses on effort, enthusiasm, and passion. Uses words like "vibrancy," "dedication," "infectious energy."
            - The Technician: Focuses on specific skills, technique, and precision. Mentions "coordination," "technique," "form," "control."
            - The Strategist/Artist: Focuses on the "why" - game sense, musicality, composition. Uses phrases like "intuitive understanding," "creative vision," "tactical awareness."
            - The Team Player: Focuses on interaction, sportsmanship, and group dynamics. Mentions "collaboration," "sportsmanship," "encourages peers."
        */
        
        // TIRED PHRASES TO AVOID: "puts in good effort", "participates well", "shows improvement"

        // ==================================================
        // 3. SCORING GUIDE (PRACTICAL 1-100)
        // ==================================================
        Look at the 'score' property for each student. Craft a highly unique, 20-30 word comment reflecting their band.
        CRITICAL: DO NOT use templates. Synthesize the tone, the topics, and the vocabulary creatively.

        [90-100] EXCEPTIONAL / LEADER:
        - Persona Goal: Celebrate leadership, flawless execution, and infectious energy.
        - Suggested Verbs/Phrases (Mix and match, do not repeat): showcases exceptional control, inspires others, demonstrates intuitive understanding, sets the benchmark, undeniable vibrancy.
        - Actionable Advice: Suggest leading peer groups, demonstrating techniques, or taking on advanced drills.

        [80-89] STRONG / DEPENDABLE:
        - Persona Goal: Acknowledge strong technique, dependability, and positive team impact.
        - Suggested Verbs/Phrases: highly dependable, reliable form, positive impact on morale, consistently demonstrates strong skills, valuable asset.
        - Actionable Advice: Focus on refining specific advanced techniques or maintaining high group morale.

        [70-79] GOOD / DEVELOPING:
        - Persona Goal: Validate developing skills and encourage teamwork and confidence.
        - Suggested Verbs/Phrases: developing solid consistency, growing confidence, willing participant, works well with peers.
        - Actionable Advice: Encourage more vocal leadership, contributing more to team goals, or refining specific forms.

        [60-69] INCONSISTENT / NEEDS FOCUS:
        - Persona Goal: Address inconsistent effort and highlight the need for focus and practice.
        - Suggested Verbs/Phrases: effort varies, developing but requires practice, sometimes lacks focus, coordination fluctuates.
        - Actionable Advice: Emphasize maintaining concentration, listening closely to instructions, or practicing routines.

        [50-59] PASSIVE / NEEDS ENCOURAGEMENT:
        - Persona Goal: Highlight passivity and encourage more physical energy and participation.
        - Suggested Verbs/Phrases: tends to be passive, holds back in group settings, basic skill level but lacks energy, hesitant application.
        - Actionable Advice: Encourage joining in fully, building self-confidence, or increasing overall physical effort.

        [40-49] DISENGAGED / STRUGGLING:
        - Persona Goal: Address significant disengagement or physical skill gaps without being overly harsh.
        - Suggested Verbs/Phrases: struggles to remain engaged, rarely participates with enthusiasm, faces hurdles in coordination, lacks drive.
        - Actionable Advice: Recommend focused introductory practice, closer instructor guidance, or finding a personal connection to the activity.

        [0-39] URGENT INTERVENTION / UNPREPARED:
        - Persona Goal: Clearly state severe lack of preparation or engagement, needing urgent administrative or parental action.
        - Suggested Verbs/Phrases: frequently unprepared, significant lack of engagement, severely affects group dynamics, urgent intervention needed.
        - Actionable Advice: Mandate immediate attitude shifts, parental involvement regarding participation, or a completely reset approach to the subject.

        STUDENT DATA: 
        ${JSON.stringify(data)}
        `;
    }

    // ACADEMIC SUBJECTS
    return `
        You are an experienced, articulate Teacher writing academic report comments for ${subject} in ${grade}.
        ${coreInstructions}

        CONTEXT:
        ${topics}

        // ==================================================
        // 2. PERSONA GUIDE (ACADEMIC SUBJECTS)
        // ==================================================
        /*
            PERSONA GUIDE:
            - The Encourager: Focuses on passion, potential, and positive attitude. Uses words like "remarkable," "commendable," "flair."
            - The Challenger: Focuses on pushing students to the next level. Uses phrases like "to elevate further," "the next step is," "is encouraged to explore."
            - The Detail-Oriented Mentor: Focuses on specific, impressive details. Mentions "lucid explanations," "analytical precision," "eloquent arguments."
            - The Collaborator: Focuses on positive impact on peers. Uses phrases like "enriches the class," "sets a high standard," "helping peers would..."
        */

        // TIRED PHRASES TO AVOID: "demonstrates exceptional understanding", "work is of a high standard", "is making steady progress"

        // ==================================================
        // 3. SCORING GUIDE (ACADEMIC 1-100)
        // ==================================================
        Look at the 'score' property for each student. Craft a highly unique, 20-30 word comment reflecting their band.
        CRITICAL: DO NOT use templates. Synthesize the tone, the topics, and the vocabulary creatively.

        [90-100] MASTERY / EXCEPTIONAL:
        - Persona Goal: Celebrate analytical precision and peer leadership.
        - Suggested Verbs/Phrases (Mix and match, do not repeat): masterfully navigates, enriches discussions, demonstrates a remarkable aptitude, elevates the class, synthesizes complex ideas.
        - Actionable Advice: Suggest exploring advanced applications or mentoring peers.

        [80-89] STRONG / DEPENDABLE:
        - Persona Goal: Acknowledge solid understanding and encourage refinement.
        - Suggested Verbs/Phrases: consistently applies, displays a robust grasp, diligent execution, dependable analysis.
        - Actionable Advice: Focus on checking work for minor errors or pushing for deeper detail in explanations.

        [70-79] GOOD / STEADY:
        - Persona Goal: Validate core understanding while nudging for more active engagement.
        - Suggested Verbs/Phrases: capable execution, understands foundational concepts, satisfactory progress.
        - Actionable Advice: Encourage more vocal participation, broader reading, or building confidence.

        [60-69] INCONSISTENT / VARIABLE:
        - Persona Goal: Address fluctuating focus and highlight the need for steady routines.
        - Suggested Verbs/Phrases: variable application, grasps concepts but rushes, potential is hindered by distraction.
        - Actionable Advice: Emphasize thorough checking of answers, maintaining focus, or establishing study habits.

        [50-59] BELOW AVERAGE / DEVELOPING:
        - Persona Goal: Highlight areas needing more focus and encourage consistent application to bridge the gap to a passing grade.
        - Suggested Verbs/Phrases: finds specific concepts challenging, effort is present but execution wavers, foundational understanding is still developing.
        - Actionable Advice: Suggest targeted practice on basics, establishing a dedicated home study routine, or increased participation.

        [40-49] STRUGGLING / NEEDS SUPPORT:
        - Persona Goal: Address significant foundational gaps directly while remaining encouraging to prevent demoralization.
        - Suggested Verbs/Phrases: struggles with the pace, retention is difficult, faces hurdles in applying concepts, requires extra support.
        - Actionable Advice: Recommend focused review of past topics, seeking one-on-one help, or attending standard extra help sessions.

        [0-39] CRITICAL / URGENT INTERVENTION:
        - Persona Goal: Clearly state severe deficits without being punitive, focusing heavily on a collaborative rescue plan.
        - Suggested Verbs/Phrases: faces severe challenges, significant gaps in understanding, urgently requires fundamental support.
        - Actionable Advice: Mandate intensive support sessions, focused remedial plans, and immediate parental involvement.

        // EDGE CASE: If a student's score is missing, null, or invalid, default to the [70-79] GOOD / STEADY tone, but add a note suggesting the teacher verify the final grade.
        
        STUDENT DATA: 
        ${JSON.stringify(data)}
        `;
  },
};
