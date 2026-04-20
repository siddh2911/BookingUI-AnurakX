import { BookingSource } from '../types';

export interface ParsedBookingData {
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
  source?: BookingSource;
  manualTotal?: number;
  notes?: string;
}

const parseWordToNumber = (word: string): number | null => {
  const map: { [key: string]: number } = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };
  return map[word.toLowerCase()] || parseInt(word) || null;
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseVoiceBooking = (text: string): ParsedBookingData => {
  const lowerText = text.toLowerCase();
  const data: ParsedBookingData = {
    notes: `Voice Transcript: "${text}"\n(Please verify all parsed fields)`
  };

  // 1. Parse Duration (Nights)
  let nights = 1; // default
  const nightsMatch = lowerText.match(/(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(nights?|days?)/);
  if (nightsMatch) {
    nights = parseWordToNumber(nightsMatch[1]) || 1;
  }

  // 2. Parse Check-in Date
  const today = new Date();
  let checkInDate = new Date(); // default today
  
  if (lowerText.includes('tomorrow')) {
    checkInDate.setDate(today.getDate() + 1);
  } else if (lowerText.includes('day after tomorrow')) {
    checkInDate.setDate(today.getDate() + 2);
  } else {
    // Basic day matching (next monday, coming friday)
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lowerText.includes(`next ${days[i]}`) || lowerText.includes(`on ${days[i]}`)) {
        const currentDayStr = today.getDay();
        let diff = i - currentDayStr;
        if (diff <= 0) diff += 7; // Next occurrence
        checkInDate.setDate(today.getDate() + diff);
        break;
      }
    }
  }
  
  data.checkIn = formatLocalDate(checkInDate);
  
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + nights);
  data.checkOut = formatLocalDate(checkOutDate);

  // 3. Parse Source
  if (lowerText.includes('airbnb')) {
    data.source = BookingSource.AIRBNB;
  } else if (lowerText.match(/booking\.?com/)) {
    data.source = BookingSource.BOOKING_COM;
  } else if (lowerText.includes('makemytrip') || lowerText.includes('make my trip') || lowerText.includes('mmt')) {
    data.source = BookingSource.MAKE_MY_TRIP;
  } else if (lowerText.includes('expedia') || lowerText.includes('agoda')) {
    data.source = BookingSource.EXPEDIA;
  } else if (lowerText.includes('walk in')) {
    data.source = BookingSource.WALK_IN;
  } else if (lowerText.includes('instagram')) {
    data.source = BookingSource.INSTAGRAM;
  }

  // 4. Parse Total Price (look for large numbers after keywords or just any big number)
  // E.g. "for 5000", "total 5000", "price 5000"
  const priceMatch = lowerText.match(/(?:total|for|price|is|amount|rupees|rs)\s*(?:of|is|at)?\s*(\d{2,})/);
  if (priceMatch && parseInt(priceMatch[1]) > 50) { // avoid capturing '2' nights as price
    data.manualTotal = parseInt(priceMatch[1]);
  } else {
    // Fallback: Just grab any absolute 4+ digit number assuming it's the price in Rupees
    const bigNumberMatch = lowerText.match(/\b(\d{3,})\b/);
    if (bigNumberMatch) {
      data.manualTotal = parseInt(bigNumberMatch[1]);
    }
  }

  // 5. Parse Guest Name
  // Heuristic: "for John Doe", "guest is John Doe", "named John Doe"
  // Stops at typical linking words
  const nameMatch = text.match(/(?:for|guest|named|is)\s+([A-Z][a-zA-Z]+\s*(?:[A-Z][a-zA-Z]+)?)/i);
  if (nameMatch) {
    let name = nameMatch[1].trim();
    // Clean up if the regex caught following filler words like 'for', 'tomorrow', 'from'
    const stopwords = ['tomorrow', 'today', 'on', 'from', 'for', 'total', 'price', 'with', 'and'];
    const words = name.split(' ');
    if (words.length > 1 && stopwords.includes(words[1].toLowerCase())) {
        name = words[0];
    }
    data.guestName = name;
  }

  return data;
};
