import { API_BASE_URL } from './api';
import { BookingSource } from '../types';
import { ParsedVoiceCommand, VoiceIntent } from './voiceParser';
import axios from 'axios';

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseVoiceCommandWithAI = async (
  text: string, 
  todayStr: string = formatLocalDate(new Date())
): Promise<ParsedVoiceCommand> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/ai/voice-query`, {
      query: text
    }, {
      withCredentials: true
    });

    const parsedData = response.data;
    
    // Check if the backend returned a direct conversational response
    const conversationalResponse = parsedData.response || parsedData.message || parsedData.answer;

    const result: ParsedVoiceCommand = {
      intent: conversationalResponse ? 'QUERY_BOOKING' : (parsedData.intent as VoiceIntent || 'CREATE_BOOKING'),
      data: {
        guestName: parsedData.guestName || undefined,
        checkIn: parsedData.checkIn || undefined,
        checkOut: parsedData.checkOut || undefined,
        source: parsedData.source as BookingSource || BookingSource.DIRECT,
        manualTotal: parsedData.manualTotal || undefined,
        notes: `AI Parsed Transcript: "${text}"`,
        aiResponse: conversationalResponse
      }
    };

    return result;

  } catch (error) {
    console.error("Backend AI Parsing Error:", error);
    throw error;
  }
};
