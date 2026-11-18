import { GoogleGenAI, Type } from '@google/genai';
import { transliterateTextToArabicFallback } from './cv-dictionary.ts';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface ArabicWorkerFields {
  fullNameAr: string;
  placeOfBirthAr: string;
  notesAr: string;
}

export async function translateWorkerFieldsToArabic(input: {
  fullNameEn: string;
  placeOfBirthEn?: string | null;
  notesEn?: string | null;
}): Promise<ArabicWorkerFields> {
  const fallback: ArabicWorkerFields = {
    fullNameAr: transliterateTextToArabicFallback(input.fullNameEn),
    placeOfBirthAr: input.placeOfBirthEn
      ? transliterateTextToArabicFallback(input.placeOfBirthEn)
      : '',
    notesAr: input.notesEn ? input.notesEn : '',
  };

  const ai = getAiClient();
  if (!ai) {
    return fallback;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: JSON.stringify({
        fullNameEn: input.fullNameEn,
        placeOfBirthEn: input.placeOfBirthEn || '',
        notesEn: input.notesEn || '',
      }),
      config: {
        systemInstruction:
          'You are an official Bangladesh-to-Saudi Arabia recruitment translator. Transliterate fullNameEn and placeOfBirthEn accurately into standard formal Arabic script, and translate notesEn into concise, professional Arabic suitable for an official domestic/skilled worker CV in Saudi Arabia. Return only JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullNameAr: { type: Type.STRING },
            placeOfBirthAr: { type: Type.STRING },
            notesAr: { type: Type.STRING },
          },
        },
      },
    });

    const raw = (response.text ?? '').trim();
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ArabicWorkerFields>;
    return {
      fullNameAr: parsed.fullNameAr?.trim() || fallback.fullNameAr,
      placeOfBirthAr: parsed.placeOfBirthAr?.trim() || fallback.placeOfBirthAr,
      notesAr: parsed.notesAr?.trim() || fallback.notesAr,
    };
  } catch (err) {
    console.warn('Gemini Arabic translation fallback triggered:', err);
    return fallback;
  }
}
