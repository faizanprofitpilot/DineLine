// Database types for Supabase - DineLine
// This is a simplified version - Supabase can generate full types, but this works for MVP

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          timezone: string;
          kitchen_emails: string[];
          hours_open: string; // TIME type as string
          hours_close: string; // TIME type as string
          after_hours_take_orders: boolean;
          reservations_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          timezone?: string;
          kitchen_emails?: string[];
          hours_open?: string;
          hours_close?: string;
          after_hours_take_orders?: boolean;
          reservations_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          name?: string;
          timezone?: string;
          kitchen_emails?: string[];
          hours_open?: string;
          hours_close?: string;
          after_hours_take_orders?: boolean;
          reservations_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          status: 'new' | 'in_progress' | 'completed';
          intent: 'order' | 'reservation' | 'info';
          order_type: 'pickup' | 'delivery' | 'reservation' | null;
          customer_name: string | null;
          customer_phone: string | null;
          delivery_address: string | null;
          requested_time: string | null;
          items: Json | null; // Array of {name, qty?, notes?}
          special_instructions: string | null;
          ai_summary: string | null;
          transcript_text: string | null;
          audio_url: string | null;
          raw_payload: Json | null;
          // Legacy fields for migration compatibility
          twilio_call_sid: string | null;
          vapi_conversation_id: string | null;
          from_number: string | null;
          to_number: string | null;
          started_at: string;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          status?: 'new' | 'in_progress' | 'completed';
          intent?: 'order' | 'reservation' | 'info';
          order_type?: 'pickup' | 'delivery' | 'reservation' | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          delivery_address?: string | null;
          requested_time?: string | null;
          items?: Json | null;
          special_instructions?: string | null;
          ai_summary?: string | null;
          transcript_text?: string | null;
          audio_url?: string | null;
          raw_payload?: Json | null;
          twilio_call_sid?: string | null;
          vapi_conversation_id?: string | null;
          from_number?: string | null;
          to_number?: string | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          status?: 'new' | 'in_progress' | 'completed';
          intent?: 'order' | 'reservation' | 'info';
          order_type?: 'pickup' | 'delivery' | 'reservation' | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          delivery_address?: string | null;
          requested_time?: string | null;
          items?: Json | null;
          special_instructions?: string | null;
          ai_summary?: string | null;
          transcript_text?: string | null;
          audio_url?: string | null;
          raw_payload?: Json | null;
          twilio_call_sid?: string | null;
          vapi_conversation_id?: string | null;
          from_number?: string | null;
          to_number?: string | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Legacy tables (kept for backward compatibility during migration)
      firms: {
        Row: {
          id: string;
          owner_user_id: string;
          firm_name: string;
          timezone: string;
          forward_to_number: string;
          notify_emails: string[];
          mode: 'after_hours' | 'failover' | 'both';
          open_days: number[];
          open_time: string;
          close_time: string;
          failover_ring_seconds: number;
          twilio_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          firm_name: string;
          timezone?: string;
          forward_to_number: string;
          notify_emails?: string[];
          mode?: 'after_hours' | 'failover' | 'both';
          open_days?: number[];
          open_time?: string;
          close_time?: string;
          failover_ring_seconds?: number;
          twilio_number?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          firm_name?: string;
          timezone?: string;
          forward_to_number?: string;
          notify_emails?: string[];
          mode?: 'after_hours' | 'failover' | 'both';
          open_days?: number[];
          open_time?: string;
          close_time?: string;
          failover_ring_seconds?: number;
          twilio_number?: string | null;
          created_at?: string;
        };
      };
      calls: {
        Row: {
          id: string;
          firm_id: string;
          twilio_call_sid: string;
          from_number: string;
          to_number: string;
          started_at: string;
          ended_at: string | null;
          route_reason: 'after_hours' | 'no_answer' | 'manual_test';
          status: 'in_progress' | 'transcribing' | 'summarizing' | 'sending_email' | 'emailed' | 'error';
          urgency: 'normal' | 'high' | 'emergency_redirected';
          recording_url: string | null;
          transcript_text: string | null;
          intake_json: Json | null;
          summary_json: Json | null;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          firm_id: string;
          twilio_call_sid: string;
          from_number: string;
          to_number: string;
          started_at?: string;
          ended_at?: string | null;
          route_reason: 'after_hours' | 'no_answer' | 'manual_test';
          status?: 'in_progress' | 'transcribing' | 'summarizing' | 'sending_email' | 'emailed' | 'error';
          urgency?: 'normal' | 'high' | 'emergency_redirected';
          recording_url?: string | null;
          transcript_text?: string | null;
          intake_json?: Json | null;
          summary_json?: Json | null;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          firm_id?: string;
          twilio_call_sid?: string;
          from_number?: string;
          to_number?: string;
          started_at?: string;
          ended_at?: string | null;
          route_reason?: 'after_hours' | 'no_answer' | 'manual_test';
          status?: 'in_progress' | 'transcribing' | 'summarizing' | 'sending_email' | 'emailed' | 'error';
          urgency?: 'normal' | 'high' | 'emergency_redirected';
          recording_url?: string | null;
          transcript_text?: string | null;
          intake_json?: Json | null;
          summary_json?: Json | null;
          error_message?: string | null;
        };
      };
    };
  };
}

