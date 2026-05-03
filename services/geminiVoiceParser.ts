import { GoogleGenAI } from '@google/genai';
import { BookingSource } from '../types';
import { ParsedVoiceCommand, ParsedBookingData, VoiceIntent } from './voiceParser';

// Use standard API key env variable naming
// Fallback key is empty, it needs to be provided in environment
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseVoiceCommandWithGemini = async (
  text: string, 
  todayStr: string = formatLocalDate(new Date())
): Promise<ParsedVoiceCommand> => {
  if (!GEMINI_API_KEY) {
    console.warn("No Gemini API key found. Falling back to rule-based parser.");
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const prompt = `
You are a hospitality booking assistant for Karuna Villa.
Parse the following voice command transcript and extract booking details.
The transcript may be in English, Hindi, or a mix of both (Hinglish).

Today's date is: ${todayStr}

Extract these fields:
1. intent: "CREATE_BOOKING" if they want to make a new booking, or "QUERY_BOOKING" if they are asking about existing bookings (who is arriving, whose booking is this, etc.)
2. guestName: The name of the guest. (e.g. "John Doe", "Rahul")
3. checkIn: The check-in date in YYYY-MM-DD format. Infer this from relative terms like "today", "tomorrow", "next monday", etc.
4. checkOut: The check-out date in YYYY-MM-DD format. Infer this from checkIn + number of nights/days mentioned. If not mentioned, default to 1 night after check-in.
5. source: The booking source. Must be one of exactly: "DIRECT", "AIRBNB", "BOOKING_COM", "MAKE_MY_TRIP", "EXPEDIA", "WALK_IN", "INSTAGRAM". Default is "DIRECT".
6. manualTotal: The total price/amount mentioned (just the number).

Respond ONLY with a valid JSON object matching this schema. Do not include markdown code blocks or any other text.
{
  "intent": "CREATE_BOOKING" | "QUERY_BOOKING",
  "guestName": "string or null",
  "checkIn": "YYYY-MM-DD",
  "checkOut": "YYYY-MM-DD",
  "source": "string",
  "manualTotal": number or null
}

Transcript: "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text;
    if (!responseText) {
       throw new Error("Empty response from Gemini");
    }

    const parsedData = JSON.parse(responseText);

    const result: ParsedVoiceCommand = {
      intent: parsedData.intent as VoiceIntent || 'CREATE_BOOKING',
      data: {
        guestName: parsedData.guestName || undefined,
        checkIn: parsedData.checkIn || undefined,
        checkOut: parsedData.checkOut || undefined,
        source: parsedData.source as BookingSource || BookingSource.DIRECT,
        manualTotal: parsedData.manualTotal || undefined,
        notes: `AI Parsed Transcript: "${text}"`
      }
    };

    return result;

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};
