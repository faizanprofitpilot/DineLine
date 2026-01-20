import { openai } from '@/lib/clients/openai';
import { OrderData, OrderItem } from '@/types';

export interface OrderSummaryResult {
  summary: string;
  customer_name: string | null;
  items: OrderItem[];
}

/**
 * Generate order summary and extract customer name and items in ONE LLM call
 * This is more efficient than making separate calls for summary and extraction
 */
export async function generateOrderSummary(
  transcript: string,
  orderData: OrderData
): Promise<OrderSummaryResult> {
  const prompt = `You are summarizing a restaurant phone order/reservation call. Generate a summary AND extract structured data in ONE response.

Transcript:
${transcript}

Existing Order Data (may be incomplete):
${JSON.stringify(orderData, null, 2)}

Return a JSON object with this exact structure:
{
  "summary": "A concise summary of the call (2-3 sentences). Include: order type (delivery/pickup/reservation), customer name, items ordered, requested time if mentioned, delivery address if applicable, and total cost if mentioned.",
  "customer_name": "Customer's full name if mentioned (e.g., 'John Smith'), or null if not found. Do NOT extract words like 'delivery', 'pickup', 'customer', 'user', etc.",
  "items": [
    {"qty": 3, "name": "mozzarella sticks"},
    {"qty": 1, "name": "margarita pizza"}
  ]
}

Rules:
- For customer_name: Extract the actual person's name only. Return null if no name is found. Never return order-related terms.
- For items: Extract food items that were ordered. For reservations, extract party size as an item like {"qty": 3, "name": "Party size"} or {"qty": 3, "name": "Table for 3"}.
- If no items are mentioned, return an empty array.
- Do NOT include prices, totals, or delivery addresses in items.
- Quantity (qty) should be a number. If quantity is not specified, use 1.
- The summary should be natural and readable, suitable for display in emails and the platform.

Return only valid JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheapest model
      messages: [
        {
          role: 'system',
          content: 'You are a restaurant order summarization assistant. Generate a summary and extract customer name and items from phone call transcripts. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Low temperature for consistent extraction
      max_tokens: 400, // Enough for summary + structured data
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    try {
      const parsed = JSON.parse(content) as OrderSummaryResult;
      
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
      
      const summary = parsed.summary && typeof parsed.summary === 'string' 
        ? parsed.summary.trim()
        : 'Order received - review transcript for details';
      
      console.log('[generateOrderSummary] Extracted:', { 
        customer_name: customerName, 
        items_count: items.length,
        summary_length: summary.length 
      });
      
      return {
        summary,
        customer_name: customerName,
        items,
      };
    } catch (parseError) {
      console.error('[generateOrderSummary] Failed to parse OpenAI response:', content, parseError);
      // Fallback
      return {
        summary: 'Order received - review transcript for details',
        customer_name: null,
        items: [],
      };
    }
  } catch (error) {
    console.error('[generateOrderSummary] OpenAI API error:', error);
    // Fallback
    return {
      summary: 'Order received - review transcript for details',
      customer_name: null,
      items: [],
    };
  }
}
