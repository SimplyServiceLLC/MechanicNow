import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const diagnoseCarIssue = async (
  symptom: string,
  vehicleInfo: string
): Promise<{ 
  diagnosis: string; 
  potentialCauses: string[];
  recommendedServices: { name: string; duration: string; parts: string[] }[] 
}> => {
  const ai = getClient();
  
  const prompt = `
    The user has a vehicle: ${vehicleInfo}.
    They are describing the following symptom: "${symptom}".
    
    Act as an expert mechanic. Analyze the symptom.
    1. Provide a technical diagnosis explaining potential causes.
    2. List 2-3 potential specific causes (short bullet points).
    3. Suggest standard mechanic services to fix this.
    4. For each service, estimate the repair time (e.g. "1-2 hours") and list common parts needed.
    
    Return ONLY JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnosis: {
              type: Type.STRING,
              description: "A technical explanation of the potential issue and causes.",
            },
            potentialCauses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of potential specific causes.",
            },
            recommendedServices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the service" },
                  duration: { type: Type.STRING, description: "Estimated time range (e.g. '1-2 hours')" },
                  parts: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "List of common parts needed" 
                  }
                }
              },
              description: "List of recommended services with details.",
            },
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No response text");
  } catch (error) {
    console.error("Gemini Diagnosis Error:", error);
    return {
      diagnosis: "We couldn't quite pinpoint that. We recommend a general inspection.",
      potentialCauses: ["Unknown issue"],
      recommendedServices: [{ name: "General Diagnostic", duration: "1 hour", parts: [] }]
    };
  }
};

export const chatWithMechanicAI = async (history: { role: string; parts: { text: string }[] }[], message: string) => {
  const ai = getClient();
  
  try {
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: "You are MechanicNow AI, a helpful assistant for a mobile mechanic service. You help users understand car problems. Keep answers concise (under 50 words) and encourage booking a mechanic.",
      },
      history: history
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm having trouble connecting to the garage server right now. Please try again.";
  }
};
