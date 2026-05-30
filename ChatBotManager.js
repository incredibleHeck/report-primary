// ==========================================
// HECTECH ChatBotManager.js (Production Ready)
// ==========================================

const ChatBotManager = {
  openSidebar: function() {
    const template = HtmlService.createTemplateFromFile('ChatBotSidebar');
    const html = template.evaluate()
        .setTitle('HecTech AI Chat Assistant')
        .setWidth(300)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    SpreadsheetApp.getUi().showSidebar(html);
  },

  getChatResponse: function(history, message, selectedText, studentContext, isGeneralMode) {
    try {
      const model = (typeof Config !== 'undefined' && Config.MODEL_NAME) ? Config.MODEL_NAME : "gemini-3.5-flash";
      const key = (typeof Config !== 'undefined') ? Config.API_KEY : "";
      
      if (!validateAPIKey(key)) {
        throw new Error("API Key is missing or invalid. Please run Setup from the HecTech menu.");
      }

      const systemInstructionText = this.getSystemInstruction(selectedText, studentContext, isGeneralMode);
      const contents = [];
      
      // 1. HARDENED ROLE-ALTERNATION MATRIX LAYER
      // Filters and guarantees strict user -> model -> user alternating compliance for Gemini arrays
      if (Array.isArray(history) && history.length > 0) {
        let lastAssignedRole = null;
        
        history.forEach(item => {
          const currentRole = (item.sender === 'user') ? 'user' : 'model';
          const cleanText = String(item.text || "").trim();
          
          if (!cleanText) return; // Skip blank fragments cleanly

          if (currentRole !== lastAssignedRole) {
            contents.push({
              role: currentRole,
              parts: [{ text: cleanText }]
            });
            lastAssignedRole = currentRole;
          } else {
            // If adjacent roles match, merge text segments safely to prevent HTTP 400 structure breaks
            contents[contents.length - 1].parts[0].text += "\n" + cleanText;
          }
        });
        
        // Enforce alternating alignment if the last appended historical block matches the next incoming message
        if (lastAssignedRole === 'user') {
          contents.push({
            role: 'model',
            parts: [{ text: "Acknowledged. Let's build upon your last adjustment requirements clean." }]
          });
        }
      }

      // Append active prompt payload entry
      contents.push({
        role: "user",
        parts: [{ text: String(message).trim() }]
      });

      const payload = {
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemInstructionText }]
        },
        generationConfig: {
          temperature: isGeneralMode ? 0.5 : 0.2, // Tighter control constraint for structural comment writing
          maxOutputTokens: 2048
        }
      };

      const response = fetchGeminiResponse(payload, model, key);
      if (response.error) {
        return { error: true, message: response.userMessage || response.message };
      }
      return { error: false, text: response.text };

    } catch (e) {
      console.error("ChatBot pipeline interruption caught:", e);
      return { error: true, message: e.message || "An unexpected communication error occurred." };
    }
  },

  getSystemInstruction: function(selectedText, studentContext, isGeneralMode) {
    let contextPrompt = "";
    
    if (studentContext && studentContext.studentName) {
      const genderPr = studentContext.studentGender === "Female" ? "She / Her / Hers" : "He / Him / His";
      contextPrompt += `\n- TARGET STUDENT CONTEXT: You are actively supporting records processing for "${studentContext.studentName}" (${studentContext.studentGender}). Use this first name parameter and the specific pronouns ${genderPr} when framing or customizing comment outputs. Do not swap names.`;
    }
    if (selectedText && String(selectedText).trim().length > 2) {
      contextPrompt += `\n- SELECTION BOUNDARY CONTEXT: The cell highlights currently isolate the following string content data: "${selectedText}". Prioritize optimizing or expanding this text context block if requested.`;
    }

    const interactiveDirectives = 
      "You are the HecTech AI Copilot, an expert interactive assistant built for teachers polishing report card comments.\n" +
      "CRITICAL BEHAVIOR: Never dump multiple report card options all at once unless explicitly asked.\n" +
      "Instead, act as a conversational brainstorming partner. Ask 1 clarifying question at a time to narrow down the teacher's intent " +
      "(e.g., 'Should we emphasize her behavioral focus or her neatness?').\n" +
      "If the user explicitly asks for options, format them strictly using clean split markers like this so the UI can separate them:\n" +
      "===OPTION_START===\n[Insert only the exact comment text here]\n===OPTION_END===\n\n";

    if (isGeneralMode) {
      return `${interactiveDirectives}You are a helpful AI Chat Assistant and strategic pedagogical brainstorming partner for an active school class teacher.
You can answer general workflow questions, break down complex educational concepts, draft template structures, or clear administrative sheet queries.
Keep response outputs clear, scannable, and actionable (under 3 sentences per conversation node) while remaining welcoming and practical. ${contextPrompt}`;
    }

    return `${interactiveDirectives}You are a Strict Report Card Editorial Assistant and Brainstorming Partner for professional primary and secondary (JHS/SHS) class instructors compiling terminal assessment commentary sheets.
Your sole role is to assist teachers with drafting, polishing, scaling, or overhauling student record evaluation blocks.

${contextPrompt}

You MUST strictly enforce the following HecTech 2.0 system localization directives across all text outputs or comment drafts:

1. DIALECT ALIGNMENT: Utilize Commonwealth/UK English spelling conventions exclusively (e.g., "behaviour", "programme", "colour", "modelling", "organisation").
2. CONVERSATIONAL TONE: Keep wording natural, direct, warm, and parent-friendly—mirroring a professional local teacher writing directly to parents. Avoid robotic or synthetic pacing.
3. PARENT-FACING ADVICE PROFILE: All prescriptive actions must speak directly to the family network. Transform detached third-person commands (e.g., "He must practice reading", "She needs to revise topics") into active parent-facing partnerships (e.g., "Please support him with reading tasks at home", "Please guide her to revise her lesson notes regularly").
4. CLEAN FIRST NAMES ONLY: Reference the child strictly by their conversational first name or standard pronoun markers. You are FORBIDDEN from introducing clinical placeholders or prefixes like "your child", "your ward", or "the pupil" before names.
5. NO PEER TUTORING: Do not write suggestions that a high-performing child should explain, coach, or tutor their peers. Keep validation anchored strictly to their personal learning journey.
6. ELIMINATE ADVERB POLLUTION: Clean out weak, robotic AI adverbs. Avoid empty structures like "works sensibly", "cooperates nicely", "handles easily", "participates happily". Describe student actions clearly and directly (e.g., "works well with peers", "completes tasks smoothly").

🟢 CRITICAL STAFFROOM LOCALIZATION SAFEGUARDS:
If the source request or draft contains generic American terms or synthetic tech descriptors, you MUST translate them instantly into local guidelines during processing:
  * Replace "worksheets", "notebooks", or "practice books" with "exercises" or "exercise books".
  * Replace "studying topics" or "reviewing files" with "revision" or "revising notes".
  * Replace "math/computer topics" with "lessons", "classwork", or "homework".

🟢 STRICT PEDAGOGICAL JARGON BAN:
Scrub out complex, detached educational terminology and replace them with plain, accessible terms:
  * exhibits / demonstrates -> shows / has / is
  * proficiency / mastery / aptitude -> excellent understanding / does well / is good at
  * cognitive skills / comprehension skills -> reading / understanding / tracking lessons
  * summative performance / pedagogical competency -> test scores / classwork / assessment tasks
  * diligent / exemplary -> hardworking / very good / exceptional

RESPONSE FORMAT PARAMETERS:
- Keep structural explanations concise (1-2 lines maximum) so teachers do not have to sift through dense blocks of text inside the narrow sidebar panel.
- Present drafted comments inside distinct, clean text regions so they are easy to scan, highlight, and copy.
- Ensure terminal report card text footprints stay within standard lengths (typically 2-4 sentences, or 50-70 words total).`;
  },

  /**
   * Safe extraction handler wraps context profiles using standardized row parameters
   */
  getChatContext: function() {
    try {
      const sheet = SpreadsheetApp.getActiveSheet();
      const activeRange = sheet.getActiveRange();
      let selectedText = "";
      if (activeRange) {
        selectedText = activeRange.getValue();
      }
      
      let studentName = "";
      let studentGender = "";
      let rowIndex = 0;
      
      if (activeRange) {
        rowIndex = activeRange.getRow();
        
        // 🟢 FIXED: Anchor lookups directly to standard Data Row 3 synchronization metrics
        const minRowBoundary = (typeof Config !== 'undefined' && Config.DATA_START_ROW) ? Config.DATA_START_ROW : 3;
        
        if (rowIndex >= minRowBoundary) {
          const ss = SpreadsheetApp.getActiveSpreadsheet();
          const classSheetName = (typeof Config !== 'undefined' && Config.CLASSLIST_SHEET_NAME) ? Config.CLASSLIST_SHEET_NAME : "CLASSLIST";
          const classlist = ss.getSheetByName(classSheetName);
          
          if (classlist && rowIndex <= classlist.getLastRow()) {
            const nameCol = (typeof Config !== 'undefined' && Config.CLASSLIST_NAME_COL) ? Config.CLASSLIST_NAME_COL : 2;
            const genderCol = (typeof Config !== 'undefined' && Config.CLASSLIST_GENDER_COL) ? Config.CLASSLIST_GENDER_COL : 5;
            
            // Map row-for-row straight across to the master registry line
            const fullName = classlist.getRange(rowIndex, nameCol).getValue();
            const genderRaw = classlist.getRange(rowIndex, genderCol).getValue();
            
            if (fullName && String(fullName).trim() !== "") {
              studentName = (typeof Config !== 'undefined') ? Config.extractFirstName(fullName) : String(fullName).split(/\s+/)[0];
              studentGender = (String(genderRaw).toUpperCase().startsWith("F")) ? "Female" : "Male";
            }
          }
        }
      }
      
      return {
        selectedText: selectedText,
        studentName: studentName,
        studentGender: studentGender,
        rowIndex: rowIndex
      };
    } catch (e) {
      console.error("Error gathering active canvas environment variables:", e);
      return { selectedText: "", studentName: "", studentGender: "", rowIndex: 0 };
    }
  }
};

// ==========================================
// CLIENT INTERFACE ATTACHMENT PIPELINES
// ==========================================

function getChatResponse(history, message, selectedText, studentContext, isGeneralMode) {
  verifyLicenseAuthorization();
  return ChatBotManager.getChatResponse(history, message, selectedText, studentContext, isGeneralMode);
}

function getChatContext() {
  verifyLicenseAuthorization();
  return ChatBotManager.getChatContext();
}

function insertTextIntoActiveCell(text) {
  verifyLicenseAuthorization();
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) {
      throw new Error("Could not acquire lock. Another user or action is writing to the sheet.");
    }
    const sheet = SpreadsheetApp.getActiveSheet();
    const activeRange = sheet.getActiveRange();
    if (!activeRange) throw new Error("No active spreadsheet cell context highlighted.");
    
    activeRange.setValue(String(text).trim());
    
    // 🟢 FIXED: Swap light-mode blue with our high-contrast premium Neon Green accent fill
    activeRange.setFontColor("#39FF14"); 
    activeRange.setFontWeight("bold");
    activeRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    return "Success";
  } catch (e) {
    console.error("Cell insertion failed:", e);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

function appendTextIntoActiveCell(text) {
  verifyLicenseAuthorization();
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) {
      throw new Error("Could not acquire lock. Another user or action is writing to the sheet.");
    }
    const sheet = SpreadsheetApp.getActiveSheet();
    const activeRange = sheet.getActiveRange();
    if (!activeRange) throw new Error("No active spreadsheet cell context highlighted.");
    
    const currentVal = String(activeRange.getValue()).trim();
    const cleanAppendText = String(text).trim();
    
    // Smooth sentence pacing appends cleanly across string boundaries
    const spacingSeparator = currentVal ? (currentVal.endsWith(".") ? " " : ". ") : "";
    const newText = currentVal + spacingSeparator + cleanAppendText;
    
    activeRange.setValue(newText);
    
    // 🟢 FIXED: Maintain high-contrast branding visibility guidelines uniformly
    activeRange.setFontColor("#39FF14"); 
    activeRange.setFontWeight("bold");
    activeRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    return "Success";
  } catch (e) {
    console.error("Cell append processing failed:", e);
    throw e;
  } finally {
    lock.releaseLock();
  }
}
