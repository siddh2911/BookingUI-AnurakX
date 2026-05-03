import { BookingSource } from '../types';

export type VoiceIntent = 'CREATE_BOOKING' | 'QUERY_BOOKING';

export interface ParsedBookingData {
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
  source?: BookingSource;
  manualTotal?: number;
  notes?: string;
  aiResponse?: string;
}

export interface ParsedVoiceCommand {
  intent: VoiceIntent;
  data: ParsedBookingData;
}

const parseWordToNumber = (word: string): number | null => {
  const map: { [key: string]: number } = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    ek: 1, do: 2, teen: 3, chaar: 4, paanch: 5,
    che: 6, saat: 7, aath: 8, nau: 9, dus: 10
  };
  return map[word.toLowerCase()] || parseInt(word) || null;
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseVoiceCommand = (text: string): ParsedVoiceCommand => {
  const lowerText = text.toLowerCase();
  const result: ParsedVoiceCommand = {
    intent: 'CREATE_BOOKING', // Default
    data: { notes: `Voice Transcript: "${text}"\n(Please verify all parsed fields)` }
  };

  // 0. Detect Intent
  // Query markers in English and Hindi
  if (lowerText.match(/\b(who|whose|when|kiski|kaun|kab|tell me about|what is on)\b/)) {
    result.intent = 'QUERY_BOOKING';
  }

  // 1. Parse Duration (Nights)
  let nights = 1;
  const nightsMatch = lowerText.match(/(one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|chaar|paanch|che|saat|aath|nau|dus|\d+)\s+(nights?|days?|din|raat)/);
  if (nightsMatch) {
    nights = parseWordToNumber(nightsMatch[1]) || 1;
  }

  // 2. Parse Check-in Date
  const today = new Date();
  let checkInDate = new Date();
  let dateFound = false;
  
  if (lowerText.includes('tomorrow') || lowerText.match(/\bkal\b/)) {
    checkInDate.setDate(today.getDate() + 1);
    dateFound = true;
  } else if (lowerText.includes('day after tomorrow') || lowerText.match(/\bparso\b/)) {
    checkInDate.setDate(today.getDate() + 2);
    dateFound = true;
  } else if (lowerText.includes('today') || lowerText.match(/\baaj\b/)) {
    checkInDate = new Date();
    dateFound = true;
  } else {
    // Basic day matching (next monday, coming friday)
    const daysEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daysHi = ['ravivar', 'somvar', 'mangalvar', 'budhvar', 'guruvar', 'shukravar', 'shanivar'];
    
    for (let i = 0; i < daysEn.length; i++) {
      if (lowerText.includes(daysEn[i]) || lowerText.includes(daysHi[i])) {
        const currentDayStr = today.getDay();
        let diff = i - currentDayStr;
        if (diff <= 0) diff += 7; // Next occurrence
        checkInDate.setDate(today.getDate() + diff);
        dateFound = true;
        break;
      }
    }

    // Explicit date matching (e.g. "April 13th", "13 april")
    if (!dateFound) {
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const monthPrefixMatch = lowerText.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/);
      const datePrefixMatch = lowerText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
      
      let dayVal = -1;
      let monthIndex = -1;

      if (monthPrefixMatch) {
        dayVal = parseInt(monthPrefixMatch[2]);
        monthIndex = months.findIndex(m => m.startsWith(monthPrefixMatch[1]));
      } else if (datePrefixMatch) {
        dayVal = parseInt(datePrefixMatch[1]);
        monthIndex = months.findIndex(m => m.startsWith(datePrefixMatch[2]));
      }

      if (dayVal > 0 && monthIndex >= 0) {
        checkInDate.setMonth(monthIndex);
        checkInDate.setDate(dayVal);
        // If the date has already passed this year, assume next year
        if (checkInDate.getTime() < today.getTime() - 86400000) {
           checkInDate.setFullYear(checkInDate.getFullYear() + 1);
        }
        dateFound = true;
      }
    }
  }
  
  if (dateFound) {
    result.data.checkIn = formatLocalDate(checkInDate);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + nights);
    result.data.checkOut = formatLocalDate(checkOutDate);
  }

  // 3. Parse Source
  if (lowerText.includes('airbnb')) {
    result.data.source = BookingSource.AIRBNB;
  } else if (lowerText.match(/booking\.?com/)) {
    result.data.source = BookingSource.BOOKING_COM;
  } else if (lowerText.match(/\b(makemytrip|make my trip|mmt)\b/)) {
    result.data.source = BookingSource.MAKE_MY_TRIP;
  } else if (lowerText.match(/\b(expedia|agoda)\b/)) {
    result.data.source = BookingSource.EXPEDIA;
  } else if (lowerText.match(/\b(walk in|chalk ke)\b/)) {
    result.data.source = BookingSource.WALK_IN;
  } else if (lowerText.includes('instagram')) {
    result.data.source = BookingSource.INSTAGRAM;
  }

  // 4. Parse Total Price
  const priceMatch = lowerText.match(/(?:total|for|price|is|amount|rupees|rs|ka)\s*(?:of|is|at)?\s*(\d{2,})/);
  if (priceMatch && parseInt(priceMatch[1]) > 50) {
    result.data.manualTotal = parseInt(priceMatch[1]);
  } else {
    const bigNumberMatch = lowerText.match(/\b(\d{3,})\b/);
    if (bigNumberMatch) {
      result.data.manualTotal = parseInt(bigNumberMatch[1]);
    }
  }

  // 5. Parse Guest Name
  // Heuristic: "for John Doe", "guest is John Doe", "named John Doe", "naam John Doe hai"
  const nameMatch = text.match(/(?:for|guest|named|is|naam)\s+([A-Z][a-zA-Z]+\s*(?:[A-Z][a-zA-Z]+)?)/i);
  if (nameMatch) {
    let name = nameMatch[1].trim();
    const stopwords = ['tomorrow', 'today', 'on', 'from', 'for', 'total', 'price', 'with', 'and', 'hai', 'ka', 'ki'];
    const words = name.split(' ');
    if (words.length > 1 && stopwords.includes(words[1].toLowerCase())) {
        name = words[0];
    }
    result.data.guestName = name;
  }

  return result;
};
