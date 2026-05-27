// ==========================================
// HECTECH ChatBotManager.js
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

  getChatResponse: function(history, message, selectedText, studentContext) {
    try {
      const model = Config.MODEL_NAME;
      const key = Config.API_KEY;
      if (!validateAPIKey(key)) {
        throw new Error("API Key is missing or invalid. Please run Setup from the HecTech menu.");
      }

      // Build system instruction
      const systemInstructionText = this.getSystemInstruction(selectedText, studentContext);

      // Build payload contents
      const contents = [];
      
      // Add history
      if (Array.isArray(history)) {
        history.forEach(item => {
          const role = (item.sender === 'user') ? 'user' : 'model';
          contents.push({
            role: role,
            parts: [{ text: item.text }]
          });
        });
      }

      // Append current message
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const payload = {
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemInstructionText }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      };

      const response = fetchGeminiResponse(payload, model, key);
      if (response.error) {
        return { error: true, message: response.userMessage || response.message };
      }
      return { error: false, text: response.text };

    } catch (e) {
      console.error("ChatBot error:", e);
      return { error: true, message: e.message || "An unexpected error occurred." };
    }
  },

  getSystemInstruction: function(selectedText, studentContext) {
    let contextPrompt = "";
    if (studentContext && studentContext.studentName) {
      const genderPr = studentContext.studentGender === "Female" ? "She/Her/Hers" : "He/Him/His";
      contextPrompt += `\n- The active student you are assisting with is named "${studentContext.studentName}" (${studentContext.studentGender}). Use this name and the pronouns ${genderPr} when drafting or referring to comments for them.`;
    }
    if (selectedText) {
      contextPrompt += `\n- The active cell in the spreadsheet currently contains: "${selectedText}". If the user asks to rewrite, polish, or make improvements, use this text as the primary source.`;
    }

    return `You are a helpful AI Chat Assistant and Brainstorming partner for class teachers drafting student report card comments.
Your primary role is to help teachers brainstorm, refine, rephrase, or write comments for their students.

${contextPrompt}

You MUST strictly enforce the following comment rules in all generated comments or rephrased comments:
1. DIALECT: Use British English (e.g., "behaviour", "programme", "colour").
2. TONE: Clear, warm, and professional—but use simple everyday words, like a Ghanaian class teacher writing to a parent.
3. PARENT-FACING RECOMMENDATIONS (CRITICAL): All recommendations/advice must be parent-facing. If a comment has detached third-person advice (e.g. "He needs to study...", "She must practice..."), you MUST rewrite that advice to address the parents directly (e.g. "Please support him to study...", "Please help her practice...").
4. STUDENT NAME ONLY: Refer to the student by their name or standard pronouns. Do NOT prefix the name with "your child" or "your ward".
5. STRICT JARGON BAN: Replace complex academic/AI jargon with plain, simple words:
   - "exhibits / demonstrates" -> "shows / has / is"
   - "proficiency / mastery / aptitude" -> "good understanding / does well / is good at"
   - "cognitive skills / comprehension skills" -> "reading / understanding"
   - "summative / pedagogical / competency" -> "test scores / classwork"
   - "facilitates / peer-learning" -> "helps / works with others"
   - "diligent / exemplary" -> "hardworking / excellent / very good"
6. NO PEER TUTORING: Do not suggest that the pupil should teach, tutor, or help classmates with schoolwork. High-performing students should only receive praise for their own work.
7. FORBIDDEN: slang, abbreviations ("&", "w/"), emojis, or overly casual phrasing.

Response guidelines:
- Be conversational and concise. Keep your chat explanations short (1-2 sentences) so the teacher doesn't have to read long walls of text.
- If you generate a comment block, present the final comment text clearly so the teacher can easily review it and copy/insert it.
- Keep the generated comments at a reasonable length (typically 2-4 sentences, or 50-70 words for general comments).`;
  }
};

// Global hooks for Google Apps Script client calling
function openChatBotSidebar() {
  ChatBotManager.openSidebar();
}

function getChatResponse(history, message, selectedText, studentContext) {
  return ChatBotManager.getChatResponse(history, message, selectedText, studentContext);
}

function getChatContext() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const activeRange = sheet.getActiveRange();
    let selectedText = "";
    if (activeRange) {
      selectedText = activeRange.getValue();
    }
    
    // Try to get student name and gender using the current selected row
    let studentName = "";
    let studentGender = "";
    let rowIndex = 0;
    
    if (activeRange) {
      rowIndex = activeRange.getRow();
      const minRow = 3; // Row 3 is the start of report data
      if (rowIndex >= minRow) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const classSheetName = Config.CLASSLIST_SHEET_NAME;
        const classlist = ss.getSheetByName(classSheetName);
        if (classlist) {
          const reportFirstRow = Config.REPORT_DATA_FIRST_ROW;
          const rowOffset = reportFirstRow - 3;
          const classlistRow = rowIndex - rowOffset;
          
          let nameCol = Config.CLASSLIST_NAME_COL;
          let genderCol = Config.CLASSLIST_GENDER_COL;
          
          if (classlistRow > 2 && classlistRow <= classlist.getLastRow()) {
            const fullName = classlist.getRange(classlistRow, nameCol).getValue();
            const genderRaw = classlist.getRange(classlistRow, genderCol).getValue();
            
            studentName = Config.extractFirstName(fullName);
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
    console.error("Error getting chat context:", e);
    return { selectedText: "", studentName: "", studentGender: "", rowIndex: 0 };
  }
}

function insertTextIntoActiveCell(text) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const activeRange = sheet.getActiveRange();
    if (!activeRange) {
      throw new Error("No cell selected.");
    }
    activeRange.setValue(text);
    activeRange.setFontColor("#1155CC"); 
    activeRange.setFontWeight("bold");
    activeRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    return "Success";
  } catch (e) {
    console.error("Error inserting text:", e);
    throw e;
  }
}
