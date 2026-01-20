import { Order } from '@/types';

/**
 * Extract customer name from order data, transcript, or summary
 * Gracefully falls back to extracting from transcript/summary if customer_name is missing
 */
export function getCustomerName(order: Order): string {
  // First, try the direct customer_name field
  if (order.customer_name) {
    return order.customer_name;
  }
  
  // Try to extract from raw_payload
  if (order.raw_payload && typeof order.raw_payload === 'object') {
    const payload = order.raw_payload as any;
    if (payload.customer_name) {
      return payload.customer_name;
    }
  }
  
  // Try to extract from transcript
  if (order.transcript_text) {
    const transcript = order.transcript_text;
    // Words to exclude from name extraction (order-related terms)
    const excludedWords = ['delivery', 'pickup', 'pick-up', 'carry out', 'takeout', 'take out', 'asap', 'order', 'reservation'];
    
    const namePatterns = [
      /(?:user'?s?\s+)?name\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /(?:customer'?s?\s+)?name\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /(?:caller'?s?\s+)?name\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    ];
    
    for (const pattern of namePatterns) {
      const nameMatch = transcript.match(pattern);
      if (nameMatch && nameMatch[1]) {
        const extractedName = nameMatch[1].trim();
        // Exclude order-related terms
        const nameLower = extractedName.toLowerCase();
        if (!excludedWords.some(word => nameLower === word || nameLower.includes(word))) {
          return extractedName;
        }
      }
    }
  }
  
  // Try to extract from AI summary
  if (order.ai_summary) {
    const summary = order.ai_summary;
    // Words to exclude from name extraction (order-related terms)
    const excludedWords = ['delivery', 'pickup', 'pick-up', 'carry out', 'takeout', 'take out', 'asap', 'order', 'reservation'];
    
    const namePatterns = [
      /(?:user'?s?\s+)?name\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /(?:customer'?s?\s+)?name\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /(?:caller'?s?\s+)?name\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      // Pattern for summaries like "Order for John Smith: ..." (but not "order for delivery")
      /(?:order|reservation)\s+for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s|:|$)/i,
      // Pattern for summaries like "John Smith ordered..."
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:ordered|requested|called)/i,
    ];
    
    for (const pattern of namePatterns) {
      const nameMatch = summary.match(pattern);
      if (nameMatch && nameMatch[1]) {
        const extractedName = nameMatch[1].trim();
        // Exclude order-related terms
        const nameLower = extractedName.toLowerCase();
        if (!excludedWords.some(word => nameLower === word || nameLower.includes(word))) {
          return extractedName;
        }
      }
    }
  }
  
  // Fallback to "Not provided" to match email behavior
  return 'Not provided';
}

/**
 * Extract customer phone from order data
 */
export function getCustomerPhone(order: Order): string {
  if (order.customer_phone) {
    return order.customer_phone;
  }
  
  // Try raw_payload
  if (order.raw_payload && typeof order.raw_payload === 'object') {
    const payload = order.raw_payload as any;
    if (payload.customer_phone) {
      return payload.customer_phone;
    }
  }
  
  // Try from_number
  if (order.from_number) {
    return order.from_number;
  }
  
  return 'Not provided';
}

/**
 * Extract requested time from order data, transcript, or summary
 */
export function getRequestedTime(order: Order): string {
  if (order.requested_time) {
    return order.requested_time;
  }
  
  // Try raw_payload
  if (order.raw_payload && typeof order.raw_payload === 'object') {
    const payload = order.raw_payload as any;
    if (payload.requested_time) {
      return payload.requested_time;
    }
  }
  
  // Try to extract from transcript
  if (order.transcript_text) {
    const transcript = order.transcript_text;
    
    // Pattern 1: "January 7th at 7:30 PM"
    const dateTimePattern1 = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(?:at\s+)?(\d{1,2}):?(\d{2})?\s*(am|pm)/i;
    const match1 = transcript.match(dateTimePattern1);
    if (match1) {
      const month = match1[1];
      const day = match1[2];
      const hour = match1[3];
      const minute = match1[4] || '00';
      const period = match1[5]?.toLowerCase();
      return `${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || 'PM'}`;
    }
    
    // Pattern 2: "Reservation time is set for 7:30 PM"
    const reservationTimePattern = /(?:reservation\s+)?time\s+(?:is\s+)?(?:set\s+for\s+)?(\d{1,2}):?(\d{2})?\s*(am|pm)/i;
    const resTimeMatch = transcript.match(reservationTimePattern);
    if (resTimeMatch) {
      const hour = resTimeMatch[1];
      const minute = resTimeMatch[2] || '00';
      const period = resTimeMatch[3]?.toLowerCase();
      return `${hour}:${minute} ${period?.toUpperCase() || 'PM'}`;
    }
  }
  
  // Try to extract from AI summary
  if (order.ai_summary) {
    const summary = order.ai_summary;
    
    // Look for time patterns in summary
    const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm)/i;
    const dateTimePattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:at\s+)?(\d{1,2}):?(\d{2})?\s*(am|pm)/i;
    
    const dateTimeMatch = summary.match(dateTimePattern);
    if (dateTimeMatch) {
      const month = dateTimeMatch[1];
      const day = summary.match(new RegExp(`${month}\\s+(\\d{1,2})`, 'i'))?.[1];
      const hour = dateTimeMatch[2];
      const minute = dateTimeMatch[3] || '00';
      const period = dateTimeMatch[4]?.toLowerCase();
      return `${month} ${day} at ${hour}:${minute} ${period?.toUpperCase() || 'PM'}`;
    } else {
      const timeMatch = summary.match(timePattern);
      if (timeMatch) {
        const hour = timeMatch[1];
        const minute = timeMatch[2] || '00';
        const period = timeMatch[3]?.toLowerCase();
        return `${hour}:${minute} ${period?.toUpperCase() || 'PM'}`;
      }
    }
  }
  
  return 'ASAP';
}
