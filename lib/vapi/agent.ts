import { isRestaurantOpen, formatHours } from '@/lib/utils/hours';

/**
 * Build Vapi agent configuration for a restaurant
 */
export function buildVapiAgent(
  restaurantName: string, 
  customGreeting?: string | null, 
  aiTone?: string, // Deprecated - kept for backwards compatibility but not used
  aiKnowledgeBase?: string | null,
  hoursOpen?: string,
  hoursClose?: string,
  timezone?: string,
  afterHoursTakeOrders?: boolean,
  reservationsEnabled?: boolean,
  customInstructions?: string | null
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
- Be patient and calm with callers - take your time, don't rush
- Ask ONE question at a time - never ask multiple questions in a single response
- Wait for the caller to fully answer before asking the next question
- Give callers time to think and respond - don't bombard them with questions
- Answer questions directly using the information you have
- If pricing is in the menu, share it
- Wait for the caller to finish speaking completely before responding
- When taking an order: collect information one piece at a time. First ask for name, wait for response. Then ask for phone, wait for response. Then ask for order type (pickup/delivery), wait for response. Then ask for items, wait for response. If delivery, ask for address, wait for response. Confirm the order before ending the call.
- When making a reservation: collect information one piece at a time. First ask for name, wait for response. Then ask for phone, wait for response. Then ask for date/time, wait for response. Then ask for party size, wait for response. Confirm the reservation details before ending the call.
- End calls naturally and politely${hoursContext}${aiKnowledgeBase ? `\n\nRestaurant information:\n${aiKnowledgeBase}` : ''}${customInstructions ? `\n\nCustom Instructions:\n${customInstructions}` : ''}`;

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
      backoffSeconds: 2.2, // Wait 2.2 seconds after interruption before resuming (increased by 200ms for patience)
    },
    // Add response delay to make the AI more patient and give callers time
    // This adds a 200ms delay before the AI responds
    responseDelay: 200, // Milliseconds to wait before responding (makes AI more patient)
    // Note: Call ending will be handled via server webhook when agent says goodbye
    // The webhook will detect the goodbye message and end the call
  };

  // Add tools (functions) if hours are configured
  if (tools) {
    agentConfig.model.tools = tools;
  }

  return agentConfig;
}

