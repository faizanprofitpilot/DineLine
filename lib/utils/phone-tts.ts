const DIGIT_NAMES: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '+': 'plus',
};

/**
 * Format phone numbers for TTS to be read digit-by-digit
 * Example: "+1 (555) 123-4567" -> "plus one, five, five, five, one, two, three, four, five, six, seven"
 */
export function formatPhoneForTTS(phoneNumber: string): string {
  // Remove all non-digit characters except +
  const digits = phoneNumber.replace(/[^\d+]/g, '');
  
  // Convert each character to its word name, separated by commas
  const digitWords = digits.split('').map(char => DIGIT_NAMES[char] || char);
  
  // If it's a US number (+1 followed by 10 digits), format with pauses
  if (digits.startsWith('+1') && digits.length === 12) {
    const usNumber = digits.slice(2); // Remove +1
    const areaCode = usNumber.slice(0, 3).split('').map(d => DIGIT_NAMES[d]).join(', ');
    const exchange = usNumber.slice(3, 6).split('').map(d => DIGIT_NAMES[d]).join(', ');
    const number = usNumber.slice(6).split('').map(d => DIGIT_NAMES[d]).join(', ');
    return `plus one, ${areaCode}, ${exchange}, ${number}`;
  }
  
  // For other formats, just convert digits to words
  return digitWords.join(', ');
}

/**
 * Replace phone numbers in text with TTS-formatted versions
 * Looks for common phone number patterns and replaces them
 */
export function formatTextWithPhoneNumbers(text: string): string {
  // Match phone number patterns:
  // - +1 (555) 123-4567
  // - (555) 123-4567
  // - 555-123-4567
  // - 5551234567
  // - +15551234567
  const phonePatterns = [
    /\+1\s*\(?(\d{3})\)?\s*-?\s*(\d{3})\s*-?\s*(\d{4})/g, // US format with +1
    /\(?(\d{3})\)?\s*-?\s*(\d{3})\s*-?\s*(\d{4})/g, // Standard US format
    /\+?\d{10,15}/g, // Any sequence of 10-15 digits (with optional +)
  ];

  let formatted = text;
  
  for (const pattern of phonePatterns) {
    formatted = formatted.replace(pattern, (match) => {
      return formatPhoneForTTS(match);
    });
  }

  return formatted;
}

