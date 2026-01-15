// Core data types for DineLine

// DineLine Types
export type OrderStatus = 'new' | 'in_progress' | 'completed';
export type OrderIntent = 'order' | 'reservation' | 'info';
export type OrderType = 'pickup' | 'delivery' | 'reservation';
export type AITone = 'professional' | 'warm' | 'friendly' | 'formal';

// Legacy IntakeGenie types (deprecated, kept for backward compatibility)
export type RoutingMode = 'after_hours' | 'failover' | 'both';
export type CallStatus = 'in_progress' | 'transcribing' | 'summarizing' | 'sending_email' | 'emailed' | 'error';
export type UrgencyLevel = 'normal' | 'high' | 'emergency_redirected';
export type RouteReason = 'after_hours' | 'no_answer' | 'manual_test';

// DineLine: Restaurant interface
export interface Restaurant {
  id: string;
  owner_user_id: string;
  name: string;
  timezone: string;
  kitchen_emails: string[];
  hours_open: string; // TIME format (e.g., "09:00")
  hours_close: string; // TIME format (e.g., "17:00")
  after_hours_take_orders: boolean;
  reservations_enabled: boolean;
  created_at: string;
  updated_at: string;
  // Legacy/optional fields for migration compatibility
  vapi_phone_number_id?: string | null;
  vapi_assistant_id?: string | null;
  inbound_number_e164?: string | null;
  twilio_phone_number_sid?: string | null;
  telephony_provider?: string | null;
  ai_greeting_custom?: string | null;
  ai_tone?: AITone;
  ai_knowledge_base?: string | null;
}

// Legacy: Firm interface (deprecated, kept for backward compatibility)
export interface Firm {
  id: string;
  owner_user_id: string;
  firm_name: string;
  timezone: string;
  forward_to_number?: string;
  notify_emails: string[];
  mode?: RoutingMode;
  open_days?: number[];
  open_time?: string;
  close_time?: string;
  failover_ring_seconds?: number;
  twilio_number: string | null;
  vapi_phone_number: string | null;
  vapi_phone_number_id: string | null;
  vapi_assistant_id: string | null;
  inbound_number_e164: string | null;
  twilio_phone_number_sid: string | null;
  telephony_provider: string | null;
  ai_greeting_custom: string | null;
  ai_tone: AITone;
  ai_knowledge_base: string | null;
  created_at: string;
}

// DineLine: Order interface
export interface Order {
  id: string;
  restaurant_id: string;
  status: OrderStatus;
  intent: OrderIntent;
  order_type: OrderType | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  requested_time: string | null; // e.g., "ASAP", "7:30 PM", "Tomorrow at 6"
  items: OrderItem[] | null;
  special_instructions: string | null;
  ai_summary: string | null;
  transcript_text: string | null;
  audio_url: string | null;
  raw_payload: OrderData | null;
  // Legacy fields for migration compatibility
  twilio_call_sid?: string | null;
  vapi_conversation_id?: string | null;
  from_number?: string | null;
  to_number?: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  name: string;
  qty?: number;
  notes?: string;
}

export interface OrderData {
  customer_name?: string;
  customer_phone?: string;
  order_type?: OrderType;
  requested_time?: string;
  delivery_address?: string;
  items?: OrderItem[];
  special_instructions?: string;
  allergies?: string;
  intent?: OrderIntent;
}

// Legacy: Call interface (deprecated, kept for backward compatibility)
export interface Call {
  id: string;
  firm_id: string;
  twilio_call_sid: string | null;
  vapi_conversation_id: string | null;
  from_number: string;
  to_number: string;
  started_at: string;
  ended_at: string | null;
  route_reason: RouteReason;
  status: CallStatus;
  urgency: UrgencyLevel;
  recording_url: string | null;
  transcript_text: string | null;
  intake_json: IntakeData | null;
  summary_json: SummaryData | null;
  call_category: string | null;
  error_message: string | null;
}

// Legacy: IntakeData interface (deprecated)
export interface IntakeData {
  full_name?: string;
  callback_number?: string;
  email?: string;
  reason_for_call?: string;
  incident_date_or_timeframe?: string;
  incident_location?: string;
  injury_description?: string;
  medical_treatment_received?: 'yes' | 'no' | 'unknown';
  insurance_involved?: 'yes' | 'no' | 'unknown';
  urgency_level?: 'normal' | 'high';
  emergency_redirected?: boolean;
}

export interface SummaryData {
  title: string;
  summary_bullets: string[];
  key_facts: {
    incident_date?: string;
    location?: string;
    injuries?: string;
    treatment?: string;
    insurance?: string;
  };
  action_items: string[];
  urgency_level: UrgencyLevel;
  follow_up_recommendation: string;
}

// DineLine: Conversation states for restaurant order taking
export type OrderConversationState =
  | 'START'
  | 'GREETING'
  | 'INTENT_CLASSIFY'
  | 'CUSTOMER_NAME'
  | 'CUSTOMER_PHONE'
  | 'ORDER_TYPE'
  | 'REQUESTED_TIME'
  | 'DELIVERY_ADDRESS'
  | 'ITEMS'
  | 'SPECIAL_INSTRUCTIONS'
  | 'CONFIRM'
  | 'CLOSE'
  | 'HOURS_INFO'
  | 'RESERVATION_DETAILS';

export interface OrderAgentResponse {
  assistant_say: string;
  next_state: OrderConversationState;
  updates: Partial<OrderData>;
  done: boolean;
}

// Legacy: ConversationState (deprecated)
export type ConversationState =
  | 'START'
  | 'EMERGENCY_CHECK'
  | 'EMERGENCY'
  | 'CONTACT_NAME'
  | 'CONTACT_PHONE'
  | 'CONTACT_EMAIL'
  | 'REASON'
  | 'INCIDENT_TIME'
  | 'INCIDENT_LOCATION'
  | 'INJURY'
  | 'TREATMENT'
  | 'INSURANCE'
  | 'URGENCY'
  | 'CONFIRM'
  | 'CLOSE'
  | 'SCHEDULE_CALLBACK';

export interface AgentResponse {
  assistant_say: string;
  next_state: ConversationState;
  updates: Partial<IntakeData>;
  done: boolean;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

