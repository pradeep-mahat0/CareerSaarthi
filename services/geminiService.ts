import { GoogleGenAI, Tool, GenerateContentResponse, Chat, Modality, Type, Schema } from "@google/genai";
import { AgentType, AgentResult, UserInput, GroundingSource, QuizQuestion, ResumeGrade } from "../types";

const createClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to clean JSON string from Markdown code blocks
const cleanAndParseJSON = (text: string): any => {
  try {
    // Remove markdown code block syntax if present
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Occasionally models add a prefix text, try to find the first [ or {
    const firstBracket = cleanText.indexOf('[');
    const firstBrace = cleanText.indexOf('{');
    
    // If we find brackets/braces, slice from there to ensure we get the JSON part
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
       cleanText = cleanText.substring(firstBracket);
       const lastBracket = cleanText.lastIndexOf(']');
       if (lastBracket !== -1) cleanText = cleanText.substring(0, lastBracket + 1);
    } else if (firstBrace !== -1) {
       cleanText = cleanText.substring(firstBrace);
       const lastBrace = cleanText.lastIndexOf('}');
       if (lastBrace !== -1) cleanText = cleanText.substring(0, lastBrace + 1);
    }

    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parsing Failed:", e, "Original Text:", text);
    return null;
  }
};

// Helper to extract grounding sources
const extractSources = (result: GenerateContentResponse): GroundingSource[] => {
  const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!chunks) return [];
  
  const sources: GroundingSource[] = [];
  chunks.forEach((chunk: any) => {
    if (chunk.web?.uri) {
      sources.push({
        uri: chunk.web.uri,
        title: chunk.web.title || chunk.web.uri,
      });
    }
  });
  // Deduplicate
  return sources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);
};

const getErrorDetails = (error: any): { message: string, troubleshooting: string[] } => {
  let message = "An unexpected error occurred while running the agent.";
  let troubleshooting = [
    "Check your internet connection.",
    "Try running the agent again in a few moments."
  ];

  const errString = String(error).toLowerCase();
  const errMsg = error.message?.toLowerCase() || "";

  if (errString.includes("403") || errMsg.includes("api key") || errMsg.includes("permission denied")) {
    message = "Authorization failed. The API key provided might be invalid or has expired.";
    troubleshooting = [
      "Verify that the API_KEY environment variable is set correctly.",
      "Ensure the API key has access to Generative AI services.",
      "Check if the API key has billing enabled if required."
    ];
  } else if (errString.includes("429") || errMsg.includes("quota") || errMsg.includes("exhausted") || errMsg.includes("limit")) {
    message = "Usage limit exceeded. The API quota has been reached.";
    troubleshooting = [
      "Wait for a few minutes before trying again (rate limit).",
      "Check your Google Cloud console for quota usage limits.",
      "Consider using a different API key if available."
    ];
  } else if (errMsg.includes("safety") || errMsg.includes("blocked")) {
    message = "The request was blocked due to safety settings.";
    troubleshooting = [
      "Try rephrasing your input to be more neutral.",
      "Ensure the company name and job role are appropriate.",
      "Avoid sensitive or controversial topics in the input."
    ];
  } else if (errMsg.includes("fetch") || errMsg.includes("network") || errMsg.includes("failed to fetch")) {
    message = "Network connection issue detected.";
    troubleshooting = [
      "Check your internet connection.",
      "Check if a firewall, VPN, or ad-blocker is blocking the request.",
      "Refresh the page and try again."
    ];
  } else if (errMsg.includes("500") || errMsg.includes("internal")) {
    message = "Google AI service is experiencing internal issues.";
    troubleshooting = [
        "This is likely a temporary issue on Google's end.",
        "Wait a few minutes and try again."
    ];
  }

  return { message, troubleshooting };
};

export const runAgent = async (
  agentType: AgentType,
  input: UserInput
): Promise<Partial<AgentResult>> => {
  let ai;
  try {
     ai = createClient();
  } catch (e: any) {
     return {
         content: "",
         sources: [],
         error: e.message || "Failed to initialize AI client.",
         troubleshooting: ["Ensure API_KEY is set in your environment variables."]
     };
  }

  // Agent 6 is interactive and handled via createChatSession, but we return a placeholder here to satisfy the loop.
  if (agentType === AgentType.MOCK_INTERVIEWER) {
      return {
          content: "Ready to start",
          loading: false
      };
  }

  let prompt = "";
  let useSearch = false;
  let modelId = 'gemini-2.5-flash';

  switch (agentType) {
    case AgentType.COMPANY_RESEARCH:
      useSearch = true;
      prompt = `
        You are an expert Company Research Agent.
        Target Company: "${input.companyName}"
        
        Provide a comprehensive research report covering:
        1. Company Values, Mission, and Vision.
        2. Work Culture and Ethics (Crucial for "Why this company?" answers).
        3. Core Domains, Technologies, and Industries they operate in.
        4. Key Products, Services, and recent Major Initiatives/News.
        5. A section on "Key Points for Interviews" highlighting what a candidate should mention to impress.
        
        Format the output in clean Markdown. Use bullet points and headers.
      `;
      break;

    case AgentType.RESUME_OPTIMIZATION:
      // Resume optimization benefits from higher reasoning.
      prompt = `
        You are an expert Resume Optimization Agent.
        
        Job Role: "${input.jobRole}"
        Target Company: "${input.companyName}"
        
        Job Description (JD):
        """
        ${input.jobDescription || "No specific JD provided. Optimize generally for the role."}
        """
        
        Candidate's Current Resume Content:
        """
        ${input.resumeContent || "No resume content provided. List key skills and keywords required for this role instead."}
        """
        
        Task:
        1. Analyze the JD and identify key skills, keywords, and tools required.
        2. Review the candidate's resume content (if provided) against these requirements.
        3. Suggest specific improvements, re-phrased bullet points, and formatting tips to make it ATS-friendly.
        4. If no resume is provided, create a "Ideal Resume Structure" for this role with suggested content.
        
        Format as Markdown. Be critical and constructive.
      `;
      break;

    case AgentType.RECRUITMENT_PROCESS:
      useSearch = true;
      prompt = `
        You are a Recruitment Process Research Agent.
        Target Company: "${input.companyName}"
        Target Role: "${input.jobRole}"
        
        Provide a detailed breakdown of the recruitment process for this specific company and role.
        Include:
        1. List of Rounds (e.g., Resume Screening, OA, Technical 1, Technical 2, HR).
        2. For the Online Assessment: Breakdown of topics (e.g., Aptitude, DSA, Core CS, specific platforms like HackerRank/AMCAT).
        3. For Technical Rounds: Typical focus areas (e.g., System Design for seniors, DSA for freshers, specific tech stack questions).
        4. For HR/Managerial Rounds: Behavioral competencies evaluated.
        
        Format as Markdown.
      `;
      break;

    case AgentType.PREVIOUS_QUESTIONS:
      useSearch = true;
      prompt = `
        You are a Previous Questions Aggregator Agent.
        Target Company: "${input.companyName}"
        Target Role: "${input.jobRole}"
        
        Search for and compile a curated list of previously asked interview questions for this company and role.
        
        Organize into:
        1. Online Assessment Questions (Coding problems, Aptitude topics).
        2. Technical Interview Questions (Categorized by topic: DSA, DBMS, OS, Web Dev, etc.).
        3. HR & Behavioral Questions.
        4. Managerial/Scenario-based Questions.
        
        Provide brief hints or "What they are looking for" for difficult questions.
        Format as Markdown.
      `;
      break;

    case AgentType.HR_ANSWER_GENERATION:
      useSearch = false;
      prompt = `
        You are an expert HR Interview Coach and Answer Generator.
        
        Target Company: "${input.companyName}"
        Target Role: "${input.jobRole}"
        
        Job Description:
        """${input.jobDescription || "Not provided."}"""
        
        Candidate Profile (Resume Context):
        """${input.resumeContent || "Not provided. Use generic placeholders like [My Project] or [My Previous Role] where necessary."}"""
        
        Your Goal:
        Generate the best possible HR interview answers tailored to the candidate's profile and the company's culture.
        
        Instructions:
        1. Tone must be genuine, human, structured, confident but humble.
        2. Align answers with the company's known values (e.g., leadership principles, innovation, customer obsession).
        3. Be faithful to the provided resume content. Do not hallucinate major achievements. Use the resume to highlight real skills.
        
        Generate customized answers for the following questions:
        1. **"Tell me about yourself."** (Craft a compelling elevator pitch connecting background to this role).
        2. **"Why do you want to join ${input.companyName}?"** (Connect personal motivation with company mission).
        3. **"Why should we hire you?"** (Highlight unique value proposition based on the JD).
        4. **"What is your greatest strength and weakness?"** (Provide a genuine strength and a fixable weakness with a plan).
        5. **"Describe a challenge you faced and how you handled it."** (Use the STAR method: Situation, Task, Action, Result).
        
        Format the output in Markdown. For each question, provide:
        - **The Strategy:** A brief tip on what the interviewer is looking for.
        - **The Answer:** The spoken response script.
      `;
      break;
  }

  const tools: Tool[] = useSearch ? [{ googleSearch: {} }] : [];

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: tools,
      }
    });

    const text = response.text;
    const sources = useSearch ? extractSources(response) : [];

    return {
      content: text,
      sources,
      error: undefined,
    };
  } catch (error: any) {
    console.error(`Error in agent ${agentType}:`, error);
    const { message, troubleshooting } = getErrorDetails(error);
    return {
      content: "",
      sources: [],
      error: message,
      troubleshooting
    };
  }
};

/**
 * Initializes a Chat Session for Agent 6 (Mock Interviewer).
 * Uses gemini-3-pro-preview for advanced reasoning and simulation.
 */
export const createChatSession = (input: UserInput, previousQuestionsContext?: string): Chat => {
    const ai = createClient();
    
    const systemInstruction = `
        You are Agent 6: The Mock Interviewer.
        Target Company: "${input.companyName}"
        Target Role: "${input.jobRole}"
        
        Context from Agent 4 (Previous Questions):
        """
        ${previousQuestionsContext || "No specific previous questions found. Use general standard interview questions for this role."}
        """

        Your role is to simulate a realistic interview environment for the user.
        
        RULES:
        1. Ask questions ONLY from the list provided by Agent 4 (or from general HR/technical topics if allowed).
        2. Maintain the tone of a real interviewer: professional, concise, and neutral.
        3. After the user answers, provide:
           - A brief evaluation of their response (clarity, structure, confidence, relevance).
           - Specific suggestions for improvement.
           - A stronger example of how the answer could be framed (optional, short).
        4. Do NOT reveal the correct answer immediately. First evaluate, then guide.
        5. After giving feedback, ask the next question.

        GOAL:
        Help the user practice interview answers in a safe, realistic simulation while improving confidence, delivery, and structure.

        FORMAT:
        - Start with a greeting and the first question.
        - After every user reply: Feedback -> Next Question.

        Stay consistent, supportive, and realistic.
    `;

    return ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
            systemInstruction: systemInstruction,
            thinkingConfig: { thinkingBudget: 1024 } 
        }
    });
};

/**
 * Transcribes audio blob to text using Gemini 2.5 Flash.
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const ai = createClient();
    
    // Convert Blob to Base64
    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data url prefix (e.g. "data:audio/wav;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
    });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType: audioBlob.type, data: base64Data } },
                { text: "Transcribe this audio exactly as spoken." }
            ]
        }
    });

    return response.text || "";
};

/**
 * Generates speech from text using Gemini 2.5 Flash TTS.
 */
export const generateSpeech = async (text: string): Promise<string> => {
    const ai = createClient();
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: {
            parts: [{ text: text }]
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Puck' } 
                }
            }
        }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Failed to generate speech");
    }
    
    return `data:audio/mp3;base64,${base64Audio}`;
};

// --- Game Mode Services ---

export const generateGameQuiz = async (input: UserInput): Promise<QuizQuestion[]> => {
    const ai = createClient();
    const prompt = `
        Generate 5 multiple-choice questions to test a candidate's knowledge about ${input.companyName}.
        Topics: Values, Mission, Products, Recent News, Work Culture.
        Ensure options are plausible.
        Output ONLY the JSON array.
    `;

    // Removed responseSchema due to incompatibility with googleSearch tool

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // responseMimeType and responseSchema are prohibited with googleSearch
                tools: [{ googleSearch: {} }] // Use search for accurate company info
            }
        });
        
        if (response.text) {
            return cleanAndParseJSON(response.text) as QuizQuestion[];
        }
        return [];
    } catch (e) {
        console.error("Quiz Gen Error", e);
        return [];
    }
};

export const generateResumeGrade = async (input: UserInput): Promise<ResumeGrade> => {
    const ai = createClient();
    const prompt = `
        Evaluate this resume for the role of ${input.jobRole} at ${input.companyName}.
        Resume: """${input.resumeContent}"""
        JD: """${input.jobDescription}"""
        
        Provide a score (0-100), key feedback points, and missing keywords.
        Output ONLY the JSON object.
    `;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            score: { type: Type.INTEGER },
            feedback: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["score", "feedback", "missingKeywords"]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        
        if (response.text) {
            return cleanAndParseJSON(response.text) as ResumeGrade;
        }
        return { score: 0, feedback: ["Failed to grade due to error"], missingKeywords: [] };
    } catch (e) {
        console.error("Resume Grade Error", e);
        return { score: 0, feedback: ["Error evaluating resume"], missingKeywords: [] };
    }
};

export const getImportantQuestionsList = async (input: UserInput): Promise<string[]> => {
    const ai = createClient();
    const prompt = `
        List 10 most frequently asked interview questions for ${input.jobRole} at ${input.companyName}.
        Return just the questions as strings.
        Output ONLY the JSON array.
    `;

    // Removed responseSchema due to incompatibility with googleSearch tool

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // responseMimeType and responseSchema are prohibited with googleSearch
                tools: [{ googleSearch: {} }]
            }
        });
        
        if (response.text) {
            return cleanAndParseJSON(response.text) as string[];
        }
        return [];
    } catch (e) {
        console.error("Question List Gen Error", e);
        return [];
    }
};