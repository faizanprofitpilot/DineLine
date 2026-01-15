/**
 * @deprecated DEPRECATED: Legacy IntakeGenie fallback email template (uses old "calls" and "firms" schema)
 * 
 * This file contains deprecated email templates from the old IntakeGenie system.
 * This function uses blue color schemes and the old database schema (calls/firms).
 * 
 * DO NOT USE THIS IN NEW CODE.
 * 
 * Current DineLine system uses:
 * - `sendKitchenTicket` in `lib/clients/resend.ts` (warm Toast theme, orders/restaurants schema)
 * 
 * This function is kept only for backward compatibility with legacy route:
 * - `app/api/process-call/route.ts` (old Twilio flow)
 * 
 * TODO: Remove this when legacy routes are fully migrated to DineLine schema
 */

import { resend } from '@/lib/clients/resend';
import { IntakeData, UrgencyLevel } from '@/types';

/**
 * @deprecated Legacy IntakeGenie fallback email template (uses old schema and blue colors)
 * Use `sendKitchenTicket` from `lib/clients/resend.ts` for DineLine orders
 */
export async function sendBasicFallbackEmail(
  to: string[],
  intake: IntakeData,
  transcript: string | null,
  recordingUrl: string | null,
  urgency: UrgencyLevel,
  callerPhoneNumber?: string
) {
  const subject = urgency === 'high' 
    ? `[HIGH URGENCY] Intake Call - ${intake.full_name || 'Unknown'} — ${new Date().toLocaleDateString()}`
    : `Intake Call - ${intake.full_name || 'Unknown'} — ${new Date().toLocaleDateString()}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          h2 { color: #2563eb; }
          h3 { color: #1e40af; margin-top: 1.5em; }
          ul { margin: 0.5em 0; }
          pre { font-size: 0.9em; background: #f5f5f5; padding: 1em; border-radius: 4px; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h2>Intake Call - Basic Summary</h2>
        <p><em>Note: Full summary generation failed. Below is available intake data.</em></p>
        <h3>Caller Details</h3>
        <ul>
          <li><strong>Name:</strong> ${intake.full_name || 'Not provided'}</li>
          <li><strong>Phone:</strong> ${intake.callback_number || callerPhoneNumber || 'Not provided'}</li>
          <li><strong>Email:</strong> ${intake.email || 'Not provided'}</li>
        </ul>
        ${intake.reason_for_call ? `<h3>Reason for Call</h3><p>${intake.reason_for_call}</p>` : ''}
        <div style="margin-top: 2em; padding: 1em; background: #f0f9ff; border-left: 4px solid #2563eb; border-radius: 4px;">
          <strong>Note:</strong> Full transcript and call recording are available in the IntakeGenie platform. Please log in to view the complete details.
          ${recordingUrl ? `<p style="margin-top: 1em;"><strong>Call Recording:</strong> <a href="${recordingUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">Listen to Recording</a></p>` : ''}
        </div>
      </body>
    </html>
  `;

  // Use Resend's default from address
  const fromAddress = 'IntakeGenie <onboarding@resend.dev>';

  console.log('[Process Call] Sending fallback email:', {
    to,
    from: fromAddress,
    subject,
  });

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
  });

  if (error) {
    console.error('[Process Call] Fallback email error:', error);
    throw error;
  }

  console.log('[Process Call] Fallback email sent successfully:', data?.id);
  return data;
}


