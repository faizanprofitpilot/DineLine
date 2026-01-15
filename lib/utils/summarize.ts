import { openai } from '@/lib/clients/openai';
import { SummaryData, IntakeData, UrgencyLevel } from '@/types';

export async function generateSummary(
  transcript: string,
  intake: IntakeData
): Promise<SummaryData> {
  const prompt = `You are summarizing a legal intake phone call. Generate a structured summary in JSON format.

Transcript:
${transcript}

Intake Data:
${JSON.stringify(intake, null, 2)}

Return a JSON object with this exact structure:
{
  "title": "Brief descriptive title (e.g., 'Car Accident Intake - John Doe')",
  "summary_bullets": ["Bullet 1", "Bullet 2", "Bullet 3", ...], // 5-8 key points
  "key_facts": {
    "incident_date": "Date or timeframe if available",
    "location": "City, State if available",
    "injuries": "Description of injuries if mentioned",
    "treatment": "Medical treatment status",
    "insurance": "Insurance involvement if mentioned"
  },
  "action_items": ["Action 1", "Action 2", ...], // Recommended next steps
  "urgency_level": "normal" | "high",
  "follow_up_recommendation": "Brief recommendation for attorney follow-up"
}

Be concise and professional. Focus on actionable information.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a legal intake summarization assistant. Return only valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    const parsed = JSON.parse(content) as SummaryData;
    
    // Ensure urgency_level matches intake if set
    if (intake.urgency_level === 'high' || intake.emergency_redirected) {
      parsed.urgency_level = intake.emergency_redirected ? 'emergency_redirected' : 'high';
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse summary:', content);
    // Fallback summary
    return {
      title: `Intake Call - ${intake.full_name || 'Unknown'}`,
      summary_bullets: [
        `Caller: ${intake.full_name || 'Unknown'}`,
        `Reason: ${intake.reason_for_call || 'Not specified'}`,
        `Incident: ${intake.incident_date_or_timeframe || 'Not specified'}`,
      ],
      key_facts: {
        incident_date: intake.incident_date_or_timeframe,
        location: intake.incident_location,
        injuries: intake.injury_description,
        treatment: intake.medical_treatment_received,
        insurance: intake.insurance_involved,
      },
      action_items: ['Review intake details', 'Follow up with caller'],
      urgency_level: (intake.urgency_level as UrgencyLevel) || 'normal',
      follow_up_recommendation: 'Standard follow-up recommended',
    };
  }
}

