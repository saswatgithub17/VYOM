import { GoogleGenAI, Type, Content, FunctionDeclaration } from '@google/genai';

// Use Vite's env for browser builds, but fall back to process.env when running in Node contexts.
const apiKey =
  import.meta.env.VITE_GEMINI_API_KEY ||
  // Vite's loadEnv can also populate non-VITE_ vars when defined via define config.
  (import.meta.env as any).GEMINI_API_KEY ||
  (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);

if (!apiKey) {
  console.error("GEMINI_API_KEY is missing!");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

let history: Content[] = [];

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'openWebsite',
    description: 'Opens a website in a new tab. Use this for opening YouTube, Google, etc.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'The full URL to open' }
      },
      required: ['url']
    }
  },
  {
    name: 'addTodo',
    description: 'Adds a task to the user to-do list.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        task: { type: Type.STRING, description: 'The task description' }
      },
      required: ['task']
    }
  },
  {
    name: 'takeNote',
    description: 'Saves a voice note or text note.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING, description: 'The content of the note' }
      },
      required: ['content']
    }
  },
  {
    name: 'simulateDesktopAction',
    description: 'Simulates a desktop action like opening Notepad, taking a screenshot, etc.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: 'The action to simulate (e.g., "open_notepad", "take_screenshot", "open_vscode")' }
      },
      required: ['action']
    }
  },
  {
    name: 'setReminder',
    description: 'Sets a reminder for the user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        message: { type: Type.STRING, description: 'What to remind the user about' },
        timeInSeconds: { type: Type.NUMBER, description: 'How many seconds from now to trigger the reminder' }
      },
      required: ['message', 'timeInSeconds']
    }
  },
  {
    name: 'getSystemInfo',
    description: 'Gets system information (CPU, RAM, Battery).'
  },
  {
    name: 'getWeather',
    description: 'Gets the current weather for a specific city.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: { type: Type.STRING, description: 'The name of the city' }
      },
      required: ['city']
    }
  },
  {
    name: 'sendWhatsApp',
    description: 'Opens WhatsApp Web to send a message to a specific number.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        number: { type: Type.STRING, description: 'The phone number including country code (e.g., 1234567890). If the user only provides a name, ask them for the number.' },
        message: { type: Type.STRING, description: 'The message to send' }
      },
      required: ['number', 'message']
    }
  },
  {
    name: 'createCalendarEvent',
    description: 'Opens Google Calendar to create a new event.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'The title of the event' },
        details: { type: Type.STRING, description: 'The description or details of the event' },
        date: { type: Type.STRING, description: 'The date in YYYYMMDD format (e.g., 20261231)' }
      },
      required: ['title', 'details', 'date']
    }
  },
  {
    name: 'simulateMouseKeyboard',
    description: 'Attempts to control the mouse or keyboard (like pyautogui).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: 'The action requested (e.g., "move_mouse", "type_text")' }
      },
      required: ['action']
    }
  }
];

export const sendCommandToVyom = async (
  text: string,
  executeTool: (name: string, args: any) => Promise<any>
): Promise<string> => {
  if (!apiKey) return "API Key is missing. Please configure it in the settings.";

  history.push({ role: 'user', parts: [{ text }] });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: history,
      config: {
        systemInstruction: `You are Vyom, a highly intelligent personal desktop voice assistant.
CRITICAL INSTRUCTION: Keep your spoken replies EXTREMELY concise and limited to ONLY what is required. Do not add conversational filler, pleasantries, or extra details unless explicitly asked. Answer directly.

Since you are running in a web browser, you cannot directly control the user's local OS (like moving the mouse or reading local files).
- To open a website, use openWebsite.
- To add a task, use addTodo.
- To take a note, use takeNote.
- For desktop actions (Notepad, VS Code), use simulateDesktopAction.
- To set a reminder, use setReminder.
- To get system info, use getSystemInfo.
- To get weather, use getWeather.
- To send a WhatsApp message, use sendWhatsApp.
- To create a calendar event, use createCalendarEvent.
- If asked to control the mouse or keyboard, use simulateMouseKeyboard.

Do not use markdown in your spoken responses.`,
        tools: [{ functionDeclarations }],
      }
    });

    let finalResponseText = "";

    if (response.functionCalls && response.functionCalls.length > 0) {
      if (response.candidates && response.candidates[0].content) {
        history.push(response.candidates[0].content);
      }

      const functionResponses = [];
      for (const call of response.functionCalls) {
        const result = await executeTool(call.name, call.args);
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: { result }
          }
        });
      }

      history.push({ role: 'user', parts: functionResponses });

      const followUpResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: history,
        config: {
          systemInstruction: "You are Vyom. Keep replies extremely concise and limited to only what is required.",
          tools: [{ functionDeclarations }]
        }
      });

      if (followUpResponse.functionCalls && followUpResponse.functionCalls.length > 0) {
        finalResponseText = "Action completed.";
      } else {
        finalResponseText = followUpResponse.text || "Done.";
      }
      
      if (followUpResponse.candidates && followUpResponse.candidates[0].content) {
        history.push(followUpResponse.candidates[0].content);
      }
    } else {
      finalResponseText = response.text || "";
      if (response.candidates && response.candidates[0].content) {
        history.push(response.candidates[0].content);
      }
    }

    // Clean up any SDK warnings that might have leaked into the text
    finalResponseText = finalResponseText.replace(/there are non-text parts functionCall in the response.*/gi, '').trim();
    if (!finalResponseText) finalResponseText = "Done.";

    return finalResponseText;
  } catch (error) {
    console.error("Error communicating with Vyom:", error);
    return "Error processing request.";
  }
};
