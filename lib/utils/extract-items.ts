import { OrderItem, Order } from '@/types';

/**
 * Extract items from an order, falling back to AI summary if items field is empty
 * This ensures items are displayed even when they're only mentioned in the summary
 */
export function getOrderItems(order: Order): OrderItem[] {
  // First, try to get items from the order object
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    return order.items;
  }
  
  // Try to get items from raw_payload
  const rawPayload = order.raw_payload as any;
  if (rawPayload?.items && Array.isArray(rawPayload.items) && rawPayload.items.length > 0) {
    return rawPayload.items;
  }
  
  // If items are still missing, try to extract from AI summary (regex fallback - OpenAI extraction happens in webhook)
  if (order.ai_summary) {
    const extractedItems = extractItemsFromSummary(order.ai_summary);
    if (extractedItems.length > 0) {
      return extractedItems;
    }
  }
  
  // Fallback: try transcript if available
  if (order.transcript_text) {
    const extractedItems = extractItemsFromSummary(order.transcript_text);
    if (extractedItems.length > 0) {
      return extractedItems;
    }
  }
  
  return [];
}

/**
 * Extract items from a text summary using multiple patterns
 */
function extractItemsFromSummary(text: string): OrderItem[] {
  const items: OrderItem[] = [];
  
  if (!text) return items;
  
  // Pattern 1: "Items ordered: Hot wings and wedge salad"
  const itemsOrderedPattern = /items?\s+ordered[:\s]+(.+?)(?:\s+total|$|\.)/i;
  const itemsOrderedMatch = text.match(itemsOrderedPattern);
  
  if (itemsOrderedMatch && itemsOrderedMatch[1]) {
    const itemsText = itemsOrderedMatch[1].trim();
    if (!itemsText.includes('$')) {
      const itemList = itemsText.split(/\s+and\s+|\s*,\s*/).map(s => s.trim()).filter(s => s.length > 0);
      
      for (const itemText of itemList) {
        const qtyMatch = itemText.match(/^(\d+)\s+(.+)$/);
        if (qtyMatch) {
          items.push({ qty: parseInt(qtyMatch[1], 10), name: qtyMatch[2].trim() });
        } else {
          items.push({ qty: 1, name: itemText.replace(/[.,;:!?]+$/, '') });
        }
      }
      return items;
    }
  }
  
  // Pattern 2: "order includes: 1 margarita pizza and 2 soups of the day"
  const includesPattern = /order\s+includes?[:\s]+(.+?)(?:\s+total|$|\.)/i;
  const includesMatch = text.match(includesPattern);
  
  if (includesMatch && includesMatch[1]) {
    const itemsText = includesMatch[1].trim();
    if (!itemsText.includes('$')) {
      const itemList = itemsText.split(/\s+and\s+|\s*,\s*/).map(s => s.trim()).filter(s => s.length > 0);
      
      for (const itemText of itemList) {
        const qtyMatch = itemText.match(/^(\d+)\s+(.+)$/);
        if (qtyMatch) {
          items.push({ qty: parseInt(qtyMatch[1], 10), name: qtyMatch[2].trim() });
        } else {
          items.push({ qty: 1, name: itemText.replace(/[.,;:!?]+$/, '') });
        }
      }
      return items;
    }
  }
  
  // Pattern 3: "Ordered 2 orders of hot wings" or "Ordered 2 hot wings"
  const orderedPattern = /ordered\s+(\d+)\s+(?:orders?\s+of\s+)?(.+?)(?:\s+for\s+|\s+total|$|\.)/i;
  const orderedMatch = text.match(orderedPattern);
  
  if (orderedMatch && orderedMatch[1] && orderedMatch[2]) {
    const qty = parseInt(orderedMatch[1], 10);
    const itemName = orderedMatch[2].trim();
    // Skip if it contains dollar signs or is a delivery address
    if (!itemName.includes('$') && !itemName.toLowerCase().includes('delivery') && !itemName.toLowerCase().includes('address')) {
      items.push({ qty, name: itemName.replace(/[.,;:!?]+$/, '') });
      
      // Also try to match multiple items: "Ordered 2 orders of hot wings and 1 pizza"
      const moreItemsPattern = /ordered\s+(\d+)\s+(?:orders?\s+of\s+)?(.+?)(?:\s+and\s+(\d+)\s+(?:orders?\s+of\s+)?(.+?))(?:\s+for\s+|\s+total|$|\.)/i;
      const moreItemsMatch = text.match(moreItemsPattern);
      if (moreItemsMatch && moreItemsMatch[3] && moreItemsMatch[4]) {
        const qty2 = parseInt(moreItemsMatch[3], 10);
        const itemName2 = moreItemsMatch[4].trim();
        if (!itemName2.includes('$') && !itemName2.toLowerCase().includes('delivery')) {
          items.push({ qty: qty2, name: itemName2.replace(/[.,;:!?]+$/, '') });
        }
      }
      
      return items;
    }
  }
  
  // Pattern 4: Look for "X and Y" patterns (without quantities) that aren't prices
  const simpleItemsPattern = /items?[:\s]+([^$]+?)(?:\s+total|$|\.)/i;
  const simpleItemsMatch = text.match(simpleItemsPattern);
  
  if (simpleItemsMatch && simpleItemsMatch[1]) {
    const itemsText = simpleItemsMatch[1].trim();
    const itemList = itemsText.split(/\s+and\s+|\s*,\s*/).map(s => s.trim()).filter(s => {
      return s.length > 2 && 
             !s.includes('$') && 
             !s.match(/^\d+(\.\d+)?\s*(dollars?|cents?|usd|\$)/i) &&
             !s.match(/^(total|cost|price|amount)$/i);
    });
    
    for (const itemText of itemList) {
      items.push({ qty: 1, name: itemText.replace(/[.,;:!?]+$/, '') });
    }
    return items;
  }
  
  return items;
}
