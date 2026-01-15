/**
 * @deprecated DEPRECATED: Legacy IntakeGenie email templates (uses old "calls" and "firms" schema)
 * 
 * This file contains deprecated email templates from the old IntakeGenie system.
 * These functions use blue color schemes and the old database schema (calls/firms).
 * 
 * DO NOT USE THESE IN NEW CODE.
 * 
 * Current DineLine system uses:
 * - `sendKitchenTicket` in `lib/clients/resend.ts` (warm Toast theme, orders/restaurants schema)
 * 
 * These functions are kept only for backward compatibility with legacy routes:
 * - `app/api/process-call/route.ts` (old Twilio flow)
 * - `lib/intake/processor.ts` (used by vapi webhook for legacy calls)
 * - `app/api/test-intake-email/route.ts` (test route)
 * 
 * TODO: Remove these when legacy routes are fully migrated to DineLine schema
 */

import { resend } from '@/lib/clients/resend';
import { IntakeData, SummaryData, UrgencyLevel } from '@/types';

const apiKey = process.env.RESEND_API_KEY;

function extractCallerInfo(
  intake: IntakeData,
  summary: SummaryData,
  transcript: string | null
): { name: string; phone: string; email: string } {
  let name = intake.full_name || '';
  let phone = intake.callback_number || '';
  let email = intake.email || '';

  // Try to extract name from summary bullets if not in intake
  if (!name && summary.summary_bullets) {
    for (const bullet of summary.summary_bullets) {
      const callerMatch = bullet.match(/Caller\s+(?:is|:)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|$)/i);
      if (callerMatch && callerMatch[1]) {
        name = callerMatch[1].trim();
        break;
      }
      const nameMatch = bullet.match(/^([A-Z][a-zA-Z\s]+?)\s+(?:is|was|has|had)/);
      if (nameMatch && nameMatch[1] && nameMatch[1].length > 2) {
        name = nameMatch[1].trim();
        break;
      }
    }
  }

  // Try to extract name from summary title if it contains a name
  if (!name && summary.title) {
    const titleMatch = summary.title.match(/[^-]+\s*-\s*([A-Z][a-zA-Z\s]+?)(?:\s*[—\-]|$)/);
    if (titleMatch && titleMatch[1]) {
      name = titleMatch[1].trim();
    } else {
      const altMatch = summary.title.match(/(?:Caller\s*[-:]?\s*)?([A-Z][a-zA-Z\s]{2,}?)(?:\s*[—\-]|$)/);
      if (altMatch && altMatch[1]) {
        name = altMatch[1].trim();
      }
    }
  }

  // Try to extract phone from summary bullets if not in intake
  if (!phone && summary.summary_bullets) {
    for (const bullet of summary.summary_bullets) {
      const phoneMatch = bullet.match(/(?:Phone|Number|Callback):\s*([+\d\s\-\(\)]+)/i);
      if (phoneMatch && phoneMatch[1]) {
        phone = phoneMatch[1].trim();
        break;
      }
    }
  }

  // Try to extract email from summary bullets if not in intake
  if (!email && summary.summary_bullets) {
    for (const bullet of summary.summary_bullets) {
      const emailMatch = bullet.match(/(?:Email|E-mail):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (emailMatch && emailMatch[1]) {
        email = emailMatch[1].trim();
        break;
      }
    }
  }

  return {
    name: name || 'Not provided',
    phone: phone || 'Not provided',
    email: email || 'Not provided',
  };
}

/**
 * @deprecated Legacy IntakeGenie email template (uses old schema and blue colors)
 * Use `sendKitchenTicket` from `lib/clients/resend.ts` for DineLine orders
 */
export async function sendIntakeEmail(
  to: string[],
  intake: IntakeData,
  summary: SummaryData,
  transcript: string | null,
  recordingUrl: string | null,
  urgency: UrgencyLevel,
  callerPhoneNumber?: string // Optional: caller's phone number from call metadata
) {
  // Extract caller info from multiple sources
  const callerInfo = extractCallerInfo(intake, summary, transcript);
  
  // Use callerPhoneNumber if callback_number is not available
  if (callerInfo.phone === 'Not provided' && callerPhoneNumber) {
    callerInfo.phone = callerPhoneNumber;
  }

  const subject = urgency === 'high' 
    ? `[HIGH URGENCY] New Intake Call: ${callerInfo.name} — ${new Date().toLocaleDateString()}`
    : `New Intake Call: ${callerInfo.name} — ${new Date().toLocaleDateString()}`;

  const callerDetails = `
    <h3>Caller Details</h3>
    <ul>
      <li><strong>Name:</strong> ${callerInfo.name}</li>
      <li><strong>Phone:</strong> ${callerInfo.phone}</li>
      <li><strong>Email:</strong> ${callerInfo.email}</li>
    </ul>
  `;

  const summarySection = `
    <h3>Summary</h3>
    <ul>
      ${summary.summary_bullets.map(bullet => `<li>${bullet}</li>`).join('')}
    </ul>
  `;

  const keyFacts = `
    <h3>Key Facts</h3>
    <ul>
      ${summary.key_facts.incident_date ? `<li><strong>Incident Date:</strong> ${summary.key_facts.incident_date}</li>` : ''}
      ${summary.key_facts.location ? `<li><strong>Location:</strong> ${summary.key_facts.location}</li>` : ''}
      ${summary.key_facts.injuries ? `<li><strong>Injuries:</strong> ${summary.key_facts.injuries}</li>` : ''}
      ${summary.key_facts.treatment ? `<li><strong>Treatment:</strong> ${summary.key_facts.treatment}</li>` : ''}
      ${summary.key_facts.insurance ? `<li><strong>Insurance:</strong> ${summary.key_facts.insurance}</li>` : ''}
    </ul>
  `;

  const actionItems = `
    <h3>Action Items</h3>
    <ul>
      ${summary.action_items.map(item => `<li>${item}</li>`).join('')}
    </ul>
  `;

  // Transcript and recording are available in the platform, not in email
  const recordingLink = recordingUrl 
    ? `<p style="margin-top: 1em;">
        <strong>Call Recording:</strong> <a href="${recordingUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">Listen to Recording</a>
      </p>`
    : '';
  
  const platformNote = `
    <div style="margin-top: 2em; padding: 1em; background: #f0f9ff; border-left: 4px solid #2563eb; border-radius: 4px;">
      <strong>Note:</strong> Full transcript and call recording are available in the IntakeGenie platform. Please log in to view the complete details.
      ${recordingLink}
    </div>
  `;

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
        </style>
      </head>
      <body>
        <h2>${summary.title}</h2>
        ${callerDetails}
        ${summarySection}
        ${keyFacts}
        ${actionItems}
        <h3>Follow-up Recommendation</h3>
        <p>${summary.follow_up_recommendation}</p>
        ${platformNote}
      </body>
    </html>
  `;

  // Check API key
  if (!apiKey) {
    const error = new Error('RESEND_API_KEY not configured');
    console.error('[Resend] Configuration error:', error.message);
    throw error;
  }

  const maxRetries = 3;
  let lastError: any = null;

  // Use Resend's default from address (works out of the box)
  const fromAddress = 'IntakeGenie <onboarding@resend.dev>';

  console.log('[Resend] Attempting to send intake email:', {
    to,
    from: fromAddress,
    subject,
    urgency,
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Resend] Email attempt ${attempt}/${maxRetries}...`);
      
    const { data, error } = await resend.emails.send({
        from: fromAddress,
      to,
      subject,
      html,
    });

    if (error) {
        console.error(`[Resend] Resend API returned error on attempt ${attempt}:`, error);
      throw error;
    }

      console.log('[Resend] Email sent successfully:', {
        id: data?.id,
        to,
        subject,
      });

    return data;
  } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Resend] Email attempt ${attempt}/${maxRetries} failed:`, {
        error: errorMessage,
        attempt,
        to,
      });
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff: 1s, 2s, 4s)
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[Resend] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
  }
    }
  }

  // All retries failed
  console.error('[Resend] All email attempts failed after', maxRetries, 'retries');
  throw lastError || new Error('Email sending failed after retries');
}

