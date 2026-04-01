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

    // LANGUAGE (CRITICAL): Write in simple, everyday English that any parent can read easily. Use short, common words. Avoid rare, formal, or "fancy" vocabulary—do not sound like a textbook or a thesaurus. Sound like a real teacher speaking naturally in plain language.
    // VARIETY MANDATE: For any group of students you are commenting on, you are STRICTLY FORBIDDEN from using the same primary opening verb or sentence structure twice in a row.
    // LENGTH CONSTRAINT: Strictly 20 - 30 words. Do not write more than 3 sentences.
    // GENDER RULE: Use the provided Gender field as absolute truth (Male = He/Him/His, Female = She/Her).
    // OUTPUT FORMAT: A valid RAW JSON Array of objects, NOT wrapped in markdown. Example: [ { "id": "0", "comment": "Text..." } ]
    `;

    if (isPractical) {
      return `
        You are a Coach/Instructor writing short performance comments for ${subject} in ${grade}. Keep the wording simple and natural.
        ${coreInstructions}
        
        CONTEXT:
        ${topics}

        // ==================================================
        // 2. PERSONA GUIDE (PRACTICAL SUBJECTS)
        // ==================================================
        /*
            PERSONA GUIDE (keep language plain in all of them):
            - The Motivator: effort, enthusiasm, positive attitude—simple words only.
            - The Technician: skills, technique, body control, steady improvement.
            - The Strategist/Artist: reads the game or activity well, tries creative ideas, thinks ahead.
            - The Team Player: works well with others, fair play, encourages classmates.
        */
        
        // TIRED PHRASES TO AVOID: "puts in good effort", "participates well", "shows improvement"

        // ==================================================
        // 3. SCORING GUIDE (PRACTICAL 1-100)
        // ==================================================
        Look at the 'score' property for each student. Write a clear, unique 20-30 word comment for their band using simple words only.
        CRITICAL: Do not copy a fixed template. Vary your wording, but never use stiff or fancy vocabulary.

        [90-100] EXCEPTIONAL / LEADER:
        - Persona Goal: Strong skills, leads by example, great energy.
        - Simple phrase ideas (mix; do not repeat): leads others well, strong control, picks things up quickly, sets a good example for the class.
        - Advice: help peers, try harder drills, show others how it is done.

        [80-89] STRONG / DEPENDABLE:
        - Persona Goal: Reliable skills and good attitude in the group.
        - Simple phrase ideas: steady and reliable, good technique, helps the team mood, keeps working at it.
        - Advice: polish one or two skills, keep supporting others.

        [70-79] GOOD / DEVELOPING:
        - Persona Goal: Skills growing; encourage confidence and teamwork.
        - Simple phrase ideas: getting more consistent, building confidence, joins in, works okay with others.
        - Advice: speak up more, join group goals, practice specific moves.

        [60-69] INCONSISTENT / NEEDS FOCUS:
        - Persona Goal: Effort goes up and down; needs focus and practice.
        - Simple phrase ideas: effort varies, still learning, sometimes loses focus, skills uneven.
        - Advice: listen to instructions, stay focused, practice more outside class.

        [50-59] PASSIVE / NEEDS ENCOURAGEMENT:
        - Persona Goal: Quiet or hesitant; needs to join in more.
        - Simple phrase ideas: hangs back, shy in group work, low energy at times, needs a push to take part.
        - Advice: join in fully, build confidence, put more energy in.

        [40-49] DISENGAGED / STRUGGLING:
        - Persona Goal: Hardly joins in or skills are weak; stay fair and kind.
        - Simple phrase ideas: rarely joins in with energy, finds coordination hard, seems uninterested at times.
        - Advice: extra practice basics, stay close to the teacher, find one thing they enjoy about the activity.

        [0-39] URGENT INTERVENTION / UNPREPARED:
        - Persona Goal: Often not ready or not taking part; parents and school need to step in.
        - Simple phrase ideas: often not prepared, very low engagement, affects the group, needs support right away.
        - Advice: change attitude with support, talk with parents, fresh start with clear goals.

        STUDENT DATA: 
        ${JSON.stringify(data)}
        `;
    }

    // ACADEMIC SUBJECTS
    return `
        You are a Teacher writing short academic report comments for ${subject} in ${grade}. Use simple, clear English—no fancy words.
        ${coreInstructions}

        CONTEXT:
        ${topics}

        // ==================================================
        // 2. PERSONA GUIDE (ACADEMIC SUBJECTS)
        // ==================================================
        /*
            PERSONA GUIDE (keep language plain in all of them):
            - The Encourager: interest, effort, good attitude—everyday praise.
            - The Challenger: one clear next step, "could try...", "would help to..."
            - The Detail mentor: neat work, clear explanations, careful thinking—said simply.
            - The Collaborator: helps classmates, good example in class, works well with others.
        */

        // TIRED PHRASES TO AVOID: "demonstrates exceptional understanding", "work is of a high standard", "is making steady progress"

        // ==================================================
        // 3. SCORING GUIDE (ACADEMIC 1-100)
        // ==================================================
        Look at the 'score' property for each student. Write a clear, unique 20-30 word comment for their band using simple words only.
        CRITICAL: Do not copy a fixed template. Vary your wording, but never use stiff or fancy vocabulary.

        [90-100] MASTERY / EXCEPTIONAL:
        - Persona Goal: Strong grasp of work; often helps others in class.
        - Simple phrase ideas (mix; do not repeat): understands hard topics well, explains clearly, lifts class discussion, links ideas together.
        - Advice: try extension work, help classmates who are stuck.

        [80-89] STRONG / DEPENDABLE:
        - Persona Goal: Solid understanding; nudge toward careful checking or deeper answers.
        - Simple phrase ideas: applies ideas well, steady grasp of topics, works carefully most of the time.
        - Advice: double-check small mistakes, add a bit more detail in written work.

        [70-79] GOOD / STEADY:
        - Persona Goal: Knows the basics; encourage speaking up and steady habits.
        - Simple phrase ideas: knows core ideas, progress is okay, can answer when asked.
        - Advice: join discussions more, read a bit extra, build confidence.

        [60-69] INCONSISTENT / VARIABLE:
        - Persona Goal: Up-and-down focus; needs steady routines.
        - Simple phrase ideas: work varies, understands but rushes, loses focus easily.
        - Advice: check answers slowly, stay on task, set a simple study routine at home.

        [50-59] BELOW AVERAGE / DEVELOPING:
        - Persona Goal: Some topics hard; needs steady practice to catch up.
        - Simple phrase ideas: finds parts of the work hard, tries but work uneven, basics still shaky.
        - Advice: practice key skills, short daily study time, take part more in class.

        [40-49] STRUGGLING / NEEDS SUPPORT:
        - Persona Goal: Big gaps; stay kind and point to help.
        - Simple phrase ideas: finds the pace hard, forgets earlier work, needs help to use ideas in tasks.
        - Advice: review old topics, ask for one-to-one help, come to extra help if offered.

        [0-39] CRITICAL / URGENT INTERVENTION:
        - Persona Goal: Very far behind; clear, calm plan with school and home.
        - Simple phrase ideas: working far below level, big gaps in basics, needs strong support now.
        - Advice: extra support at school, clear plan with parents, go back to foundation skills.

        // EDGE CASE: If a student's score is missing, null, or invalid, default to the [70-79] GOOD / STEADY tone, but add a note suggesting the teacher verify the final grade.
        
        STUDENT DATA: 
        ${JSON.stringify(data)}
        `;
  },
};
