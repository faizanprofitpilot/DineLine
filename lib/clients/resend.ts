import { Resend } from 'resend';
import { SummaryData, IntakeData, UrgencyLevel, Order, OrderData, OrderItem } from '@/types';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error('Missing RESEND_API_KEY');
}

export const resend = new Resend(apiKey);

// Helper function to extract caller information from multiple sources
function extractCallerInfo(
  intake: IntakeData,
  summary: SummaryData,
  transcript: string | null
): { name: string; phone: string; email: string } {
  let name = intake.full_name || '';
  let phone = intake.callback_number || '';
  let email = intake.email || '';

  console.log('[extractCallerInfo] Initial name from intake.full_name:', name || 'NOT SET');
  console.log('[extractCallerInfo] Summary title:', summary.title || 'NOT SET');

  // Try to extract name from summary bullets if not in intake
  if (!name && summary.summary_bullets) {
    for (const bullet of summary.summary_bullets) {
      // Look for patterns like "Caller is [Name]" or "Caller: [Name]"
      const callerMatch = bullet.match(/Caller\s+(?:is|:)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|$)/i);
      if (callerMatch && callerMatch[1]) {
        name = callerMatch[1].trim();
        break;
      }
      // Also check if bullet starts with a name pattern
      const nameMatch = bullet.match(/^([A-Z][a-zA-Z\s]+?)\s+(?:is|was|has|had)/);
      if (nameMatch && nameMatch[1] && nameMatch[1].length > 2) {
        name = nameMatch[1].trim();
        break;
      }
    }
  }

  // Try to extract name from summary title if it contains a name
  if (!name && summary.title) {
    // Pattern: "Car Accident Intake - John Smith the Third" or "Work Injury Intake - Johnson Smith" or "Intake Call - John Doe"
    // Match anything before dash (category) and after dash (name) - name should start with capital letter
    const titleMatch = summary.title.match(/[^-]+\s*-\s*([A-Z][a-zA-Z\s]+?)(?:\s*[—\-]|$)/);
    if (titleMatch && titleMatch[1]) {
      name = titleMatch[1].trim();
      console.log('[extractCallerInfo] Extracted name from title:', name);
    } else {
      console.log('[extractCallerInfo] Failed to extract name from title, title:', summary.title);
      // Try alternative pattern: "Caller - [Name]" or just match after last dash
      const altMatch = summary.title.match(/(?:Caller\s*[-:]?\s*)?([A-Z][a-zA-Z\s]{2,}?)(?:\s*[—\-]|$)/);
      if (altMatch && altMatch[1]) {
        name = altMatch[1].trim();
        console.log('[extractCallerInfo] Extracted name using alternative pattern:', name);
      }
    }
  }

  console.log('[extractCallerInfo] Final extracted name:', name || 'NOT SET');

  // Try to extract phone from summary bullets if not in intake
  if (!phone && summary.summary_bullets) {
    for (const bullet of summary.summary_bullets) {
      // Look for phone number patterns
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
      // Look for email patterns
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
      <strong>Note:</strong> Full transcript and call recording are available in the DineLine platform. Please log in to view the complete details.
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
  const fromAddress = 'DineLine <onboarding@resend.dev>';

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

/**
 * Send kitchen ticket email for DineLine orders
 * Plain text format for easy reading in kitchen environments
 */
export async function sendKitchenTicket(
  to: string[],
  restaurantName: string,
  order: Order,
  orderData: OrderData,
  transcript: string | null,
  recordingUrl: string | null,
  dashboardUrl?: string // Optional: link to order in dashboard
) {
  const orderType = order.order_type === 'delivery' ? 'Delivery' : 
                    order.order_type === 'pickup' ? 'Pickup' : 
                    order.order_type === 'reservation' ? 'Reservation' : 'Order';
  
  // Subject line: Use "Reservation" for reservations, "Order" for orders
  const subject = order.order_type === 'reservation' 
    ? `New Phone Reservation — ${restaurantName}`
    : `New Phone Order — ${restaurantName} — ${orderType}`;

  // Palette (warm Toast-inspired)
  const colors = {
    bg: '#FFF8DC',
    card: '#FFFFFF',
    border: '#DEB887',
    heading: '#8B4513',
    text: '#654321',
    accent: '#FF8C42',
    muted: '#A0522D',
    badgeNew: '#FFE4B5',
  };

  // Format items list (text + HTML)
  const sourceItems = (orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0)
    ? orderData.items
    : (order.items && Array.isArray(order.items) ? order.items : []);

  const itemsText = sourceItems.length > 0
    ? sourceItems.map((item: OrderItem) => {
        const qty = item.qty ? `${item.qty}x ` : '';
        const notes = item.notes ? ` (${item.notes})` : '';
        return `  - ${qty}${item.name}${notes}`;
      }).join('\n')
    : '  (No items specified)';

  const itemsHtml = sourceItems.length > 0
    ? sourceItems.map((item: OrderItem) => {
        const qty = item.qty ? `${item.qty}x ` : '';
        const notes = item.notes ? `<span style="color: ${colors.muted};"> (${item.notes})</span>` : '';
        return `<li style="padding: 6px 0; border-bottom: 1px dashed ${colors.border};">
          <span style="font-weight: 600; color: ${colors.text};">${qty}${item.name}</span>
          ${notes}
        </li>`;
      }).join('')
    : `<li style="padding: 6px 0; color: ${colors.muted};">No items specified</li>`;

  const requestedTime = order.requested_time || orderData.requested_time || 'ASAP';
  const deliveryBlock = order.order_type === 'delivery' && (order.delivery_address || orderData.delivery_address)
    ? `<div style="margin-top: 10px;">
        <div style="font-size: 12px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.04em;">Delivery Address</div>
        <div style="font-weight: 600; color: ${colors.text}; margin-top: 4px;">${order.delivery_address || orderData.delivery_address}</div>
      </div>`
    : '';

  const specialInstructions = order.special_instructions || orderData.special_instructions;

  // Build HTML email (matches product theme)
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="margin:0; padding:0; background:${colors.bg}; font-family: 'Source Sans Pro', Arial, sans-serif; color:${colors.text};">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${colors.bg}; padding:24px;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px; background:${colors.card}; border:1px solid ${colors.border}; border-radius:18px; box-shadow:0 10px 30px rgba(0,0,0,0.05); overflow:hidden;">
                <!-- Header -->
                <tr>
                  <td style="background:${colors.card}; padding:20px 24px; border-bottom:1px solid ${colors.border};">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <div style="font-size:20px; font-weight:800; color:${colors.heading}; letter-spacing:0.01em;">DineLine Kitchen Ticket</div>
                      <div style="padding:6px 10px; background:${colors.badgeNew}; color:${colors.heading}; border-radius:999px; font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:0.05em;">
                        ${orderType}
                      </div>
                    </div>
                    <div style="margin-top:6px; color:${colors.muted}; font-size:14px;">${restaurantName}</div>
                  </td>
                </tr>

                <!-- Order + Customer -->
                <tr>
                  <td style="padding:20px 24px; border-bottom:1px solid ${colors.border};">
                    <div style="display:flex; flex-wrap:wrap; gap:18px;">
                      <div style="flex:1; min-width:220px;">
                        <div style="font-size:12px; color:${colors.muted}; text-transform:uppercase; letter-spacing:0.05em;">Customer</div>
                        <div style="margin-top:6px; font-weight:700; color:${colors.text};">${order.customer_name || orderData.customer_name || 'Not provided'}</div>
                        <div style="margin-top:4px; color:${colors.muted}; font-size:14px;">${order.customer_phone || orderData.customer_phone || 'Not provided'}</div>
                      </div>
                      <div style="flex:1; min-width:220px;">
                        <div style="font-size:12px; color:${colors.muted}; text-transform:uppercase; letter-spacing:0.05em;">Requested Time</div>
                        <div style="margin-top:6px; font-weight:700; color:${colors.text};">${requestedTime}</div>
                        ${deliveryBlock}
                      </div>
                    </div>
                  </td>
                </tr>

                <!-- Items -->
                <tr>
                  <td style="padding:20px 24px; border-bottom:1px solid ${colors.border};">
                    <div style="font-size:12px; color:${colors.muted}; text-transform:uppercase; letter-spacing:0.05em;">Items</div>
                    <ul style="list-style:none; padding:0; margin:10px 0 0 0;">${itemsHtml}</ul>
                  </td>
                </tr>

                <!-- Notes -->
                <tr>
                  <td style="padding:20px 24px; border-bottom:1px solid ${colors.border};">
                    <div style="display:flex; flex-direction:column; gap:12px;">
                      ${specialInstructions ? `
                        <div>
                          <div style="font-size:12px; color:${colors.muted}; text-transform:uppercase; letter-spacing:0.05em;">Special Instructions</div>
                          <div style="margin-top:6px; color:${colors.text}; font-weight:600;">${specialInstructions}</div>
                        </div>
                      ` : ''}
                      ${order.ai_summary ? `
                        <div>
                          <div style="font-size:12px; color:${colors.muted}; text-transform:uppercase; letter-spacing:0.05em;">Call Summary</div>
                          <div style="margin-top:6px; color:${colors.text}; line-height:1.5;">${order.ai_summary}</div>
                        </div>
                      ` : ''}
                    </div>
                  </td>
                </tr>

                <!-- Meta -->
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
                      <div style="color:${colors.muted}; font-size:14px;">Received: <strong style="color:${colors.text};">${new Date(order.started_at).toLocaleString()}</strong></div>
                      ${recordingUrl ? `<a href="${recordingUrl}" style="margin-left:auto; padding:10px 14px; background:${colors.card}; border:1px solid ${colors.border}; border-radius:12px; color:${colors.heading}; text-decoration:none; font-weight:700;">Listen to Recording</a>` : ''}
                      ${dashboardUrl ? `<a href="${dashboardUrl}" style="margin-left:${recordingUrl ? '0' : 'auto'}; padding:10px 14px; background:${colors.accent}; color:#fff; border-radius:12px; text-decoration:none; font-weight:700;">View in Dashboard</a>` : ''}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  // Plain text fallback
  const body = `
${restaurantName}

Order Type: ${orderType}
Requested Time: ${requestedTime}

Customer Information:
  Name: ${order.customer_name || orderData.customer_name || 'Not provided'}
  Phone: ${order.customer_phone || orderData.customer_phone || 'Not provided'}

${order.order_type === 'delivery' && (order.delivery_address || orderData.delivery_address) ? `Delivery Address:
  ${order.delivery_address || orderData.delivery_address}

` : ''}Items:
${itemsText}

${specialInstructions ? `Special Instructions:
  ${specialInstructions}

` : ''}${order.ai_summary ? `Call Summary:
  ${order.ai_summary}

` : ''}Call Details:
  Time: ${new Date(order.started_at).toLocaleString()}
  ${recordingUrl ? `Recording: ${recordingUrl}` : ''}

${dashboardUrl ? `View in Dashboard: ${dashboardUrl}` : ''}
`.trim();

  // Check API key
  if (!apiKey) {
    const error = new Error('RESEND_API_KEY not configured');
    console.error('[Resend] Configuration error:', error.message);
    throw error;
  }

  const maxRetries = 3;
  let lastError: any = null;

  // Use Resend's default from address (works out of the box)
  const fromAddress = 'DineLine <onboarding@resend.dev>';

  console.log('[Resend] Attempting to send kitchen ticket:', {
    to,
    from: fromAddress,
    subject,
    restaurantName,
    orderType,
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Resend] Kitchen ticket email attempt ${attempt}/${maxRetries}...`);
      
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to,
        subject,
        text: body, // Plain text fallback
        html,
      });

      if (error) {
        console.error(`[Resend] Resend API returned error on attempt ${attempt}:`, error);
        throw error;
      }

      console.log('[Resend] Kitchen ticket sent successfully:', {
        id: data?.id,
        to,
        subject,
      });

      return data;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Resend] Kitchen ticket email attempt ${attempt}/${maxRetries} failed:`, {
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
  console.error('[Resend] All kitchen ticket email attempts failed after', maxRetries, 'retries');
  throw lastError || new Error('Kitchen ticket email sending failed after retries');
}

