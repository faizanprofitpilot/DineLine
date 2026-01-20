import { openai } from '@/lib/clients/openai';
import { OrderItem } from '@/types';

export interface ExtractedOrderInfo {
  customer_name: string | null;
  items: OrderItem[];
}

/**
 * Use OpenAI's cheapest model to extract customer name and items from AI summary
 * This is more reliable than regex patterns
 */
export async function extractOrderInfoFromSummary(aiSummary: string): Promise<ExtractedOrderInfo> {
  if (!aiSummary || aiSummary.trim().length === 0) {
    return { customer_name: null, items: [] };
  }

  const prompt = `Extract the customer name and ordered items from this restaurant order/reservation summary.

Summary:
${aiSummary}

Return a JSON object with this exact structure:
{
  "customer_name": "Customer's full name if mentioned, or null if not found",
  "items": [
    {"qty": 2, "name": "Italian salads"},
    {"qty": 1, "name": "Margarita pizza"}
  ]
}

Rules:
- For customer_name: Extract the actual person's name (e.g., "John Smith", "Faizan"). Return null if no name is found. Do NOT extract words like "delivery", "pickup", "customer", "user", etc.
- For items: Extract food items that were ordered. For reservations, extract party size as an item like {"qty": 3, "name": "Party size"} or {"qty": 3, "name": "Table for 3"}.
- If no items are mentioned, return an empty array.
- Do NOT include prices, totals, or delivery addresses in items.
- Quantity (qty) should be a number. If quantity is not specified, use 1.

Return only valid JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheapest model
      messages: [
        {
          role: 'system',
          content: 'You are a data extraction assistant. Extract customer name and items from restaurant order summaries. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 300, // Limit tokens for cost efficiency
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.warn('[extractOrderInfoFromSummary] No response from OpenAI');
      return { customer_name: null, items: [] };
    }

    try {
      const parsed = JSON.parse(content) as ExtractedOrderInfo;
      
      // Validate and clean the extracted data
      const customerName = parsed.customer_name && 
                          typeof parsed.customer_name === 'string' && 
                          parsed.customer_name.trim().length > 0 &&
                          !['delivery', 'pickup', 'customer', 'user', 'caller'].includes(parsed.customer_name.toLowerCase())
                        ? parsed.customer_name.trim()
                        : null;
      
      const items: OrderItem[] = Array.isArray(parsed.items)
        ? parsed.items
            .filter((item: any) => item && item.name && typeof item.name === 'string')
            .map((item: any) => ({
              qty: typeof item.qty === 'number' && item.qty > 0 ? item.qty : 1,
              name: item.name.trim(),
              notes: item.notes && typeof item.notes === 'string' ? item.notes.trim() : undefined,
            }))
        : [];
      
      console.log('[extractOrderInfoFromSummary] Extracted:', { customer_name: customerName, items_count: items.length });
      
      return {
        customer_name: customerName,
        items,
      };
    } catch (parseError) {
      console.error('[extractOrderInfoFromSummary] Failed to parse OpenAI response:', content, parseError);
      return { customer_name: null, items: [] };
    }
  } catch (error) {
    console.error('[extractOrderInfoFromSummary] OpenAI API error:', error);
    return { customer_name: null, items: [] };
  }
}
