import { isRestaurantOpen, formatHours } from '@/lib/utils/hours';

/**
 * Build Vapi agent configuration for a restaurant
 */
export function buildVapiAgent(
  restaurantName: string, 
  customGreeting?: string | null, 
  aiTone?: string, 
  aiKnowledgeBase?: string | null,
  hoursOpen?: string,
  hoursClose?: string,
  timezone?: string,
  afterHoursTakeOrders?: boolean,
  reservationsEnabled?: boolean
) {
  const DEFAULT_GREETING = "Thank you for calling {RESTAURANT_NAME}. I'm an automated assistant. I can help you place an order for pickup or delivery, make a reservation, or answer questions about our menu and hours. How can I help you today?";
  const OLD_DEFAULT_GREETING = "Thank you for calling {RESTAURANT_NAME}. I'm an automated assistant. How can I help you today?";
  
  // If custom greeting matches the old default, treat it as null to use new default
  let effectiveCustomGreeting = customGreeting;
  if (customGreeting) {
    const normalizedCustom = customGreeting.replace(/{RESTAURANT_NAME}/g, restaurantName).replace(/{FIRM_NAME}/g, restaurantName);
    const normalizedOldDefault = OLD_DEFAULT_GREETING.replace(/{RESTAURANT_NAME}/g, restaurantName);
    if (normalizedCustom === normalizedOldDefault) {
      // This is the old default, treat as null to use new default
      effectiveCustomGreeting = null;
      console.log('[buildVapiAgent] Detected old default greeting, using new default instead');
    }
  }
  
  const greeting = effectiveCustomGreeting 
    ? effectiveCustomGreeting.replace(/{RESTAURANT_NAME}/g, restaurantName).replace(/{FIRM_NAME}/g, restaurantName)
    : DEFAULT_GREETING.replace(/{RESTAURANT_NAME}/g, restaurantName);

  // Map tone to communication style instructions
  const toneInstructions: Record<string, string> = {
    professional: 'Maintain a calm, clear, and businesslike tone. Be direct and efficient.',
    warm: 'Use a friendly and empathetic tone. Show genuine care and understanding.',
    friendly: 'Be conversational and approachable. Use a relaxed, personable style.',
    formal: 'Use a reserved and respectful tone. Maintain professional distance while being courteous.',
  };

  const toneGuidance = aiTone && toneInstructions[aiTone] 
    ? `\n\nCommunication style: ${toneInstructions[aiTone]}`
    : '';

  // Build hours context if provided
  let hoursContext = '';
  if (hoursOpen && hoursClose && timezone) {
    const formattedHours = formatHours(hoursOpen, hoursClose);
    
    // Build reservations context
    const reservationsNote = reservationsEnabled 
      ? ` Reservations are always available, even when closed.`
      : '';
    
    hoursContext = `\n\nRestaurant Hours: ${formattedHours} (${timezone} timezone)
After Hours Orders: ${afterHoursTakeOrders ? 'Yes - can take orders for tomorrow' : 'No'}
Reservations: ${reservationsEnabled ? 'Always available' : 'Not available'}${reservationsNote}

If you need to check if the restaurant is currently open, use the checkRestaurantHours function once at the start of the call.`;
  }

  const systemPrompt = `You are a friendly and professional AI receptionist for ${restaurantName}, a restaurant.

Your job:
- Answer questions about menu items, prices, and anything else you know
- Take orders for pickup or delivery
- Make reservations${reservationsEnabled ? ' (always available)' : ''}
- Be helpful and answer any questions you can

Guidelines:
- Answer questions directly using the information you have
- If pricing is in the menu, share it
- One question at a time
- Wait for the caller to finish speaking before responding
- When taking an order: collect name, phone, order type (pickup/delivery), items, delivery address if needed. Calculate the total price and confirm the order. Always state the total order price before ending the call.
- When making a reservation: collect name, phone, date/time, and party size. Confirm the reservation details before ending the call.
- End order calls by saying: "Perfect. Your total is $[TOTAL]. I've sent this to the kitchen. Someone will confirm shortly. Thanks for calling ${restaurantName}!"
- End reservation calls by saying: "Perfect. I've confirmed your reservation for [DATE/TIME] for [PARTY SIZE]. Someone will confirm shortly. Thanks for calling ${restaurantName}!"${toneGuidance}${hoursContext}${aiKnowledgeBase ? `\n\nRestaurant information:\n${aiKnowledgeBase}` : ''}

IMPORTANT: When the call ends, you must provide structured data with:
- intent: "order" for orders, "reservation" for reservations, "info" for questions
- order_type: "pickup" or "delivery" for orders, "reservation" for reservations
- customer_name: the caller's name
- customer_phone: the caller's phone number
- requested_time: when they want the order/reservation (e.g., "ASAP", "7:30 PM", "tomorrow at 6")
- items: array of items for orders (e.g., [{"name": "Pizza", "qty": 1}])
- special_instructions: any special requests or notes`;

  // Add server-side function for checking restaurant hours
  // This ensures the LLM gets accurate, real-time status from the server
  const tools = hoursOpen && hoursClose && timezone ? [
    {
      type: 'function',
      function: {
        name: 'checkRestaurantHours',
        description: 'Check if the restaurant is currently open or closed. Only call this once at the start of the call if you need to know the current status.',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    }
  ] : undefined;

  // Log tone configuration for debugging
  if (aiTone) {
    console.log(`[buildVapiAgent] Tone: ${aiTone}, Guidance: ${toneInstructions[aiTone] || 'none'}`);
  }

  const agentConfig: any = {
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.4,
      maxTokens: 180,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
      ],
    },
    voice: {
      provider: 'deepgram',
      voiceId: 'asteria', // Vapi uses just the voice name, not 'aura-asteria-en'
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
    },
    firstMessage: greeting,
    // Configure stopSpeakingPlan to prevent interruptions
    // High values mean agent waits longer before interrupting
    stopSpeakingPlan: {
      numWords: 5, // Wait for caller to say at least 5 words before considering interruption
      voiceSeconds: 0.5, // Require 0.5 seconds of continuous speech before stopping (max allowed by Vapi)
      backoffSeconds: 2.0, // Wait 2 seconds after interruption before resuming
    },
    // Note: Call ending will be handled via server webhook when agent says goodbye
    // The webhook will detect the goodbye message and end the call
  };

  // Add tools (functions) if hours are configured
  if (tools) {
    agentConfig.model.tools = tools;
  }

  return agentConfig;
}

