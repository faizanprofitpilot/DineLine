import { createClient } from '@deepgram/sdk';

const apiKey = process.env.DEEPGRAM_API_KEY;

if (!apiKey) {
  throw new Error('Missing DEEPGRAM_API_KEY');
}

export const deepgram = createClient(apiKey);

export async function transcribeRecording(recordingUrl: string): Promise<string> {
  try {
    console.log('[Deepgram] Starting transcription for URL:', recordingUrl);
    
    // Deepgram batch transcription
    // For Twilio recordings, we need to use the actual MP3 URL
    // Deepgram can handle URLs, but Twilio URLs require authentication
    // We'll need to either download the file first or use Deepgram's URL transcription
    // Since Twilio URLs are public (with auth token in some cases), let's try direct URL first
    
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: recordingUrl } as any,
      {
        model: 'nova-2',
        language: 'en-US',
        punctuate: true,
        paragraphs: true,
      }
    );

    if (error) {
      console.error('[Deepgram] Transcription error response:', error);
      throw error;
    }

    // Extract transcript text
    const transcript =
      result?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript ||
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ||
      '';

    if (!transcript) {
      console.warn('[Deepgram] Transcription completed but transcript is empty');
      throw new Error('Transcription returned empty result');
    }

    console.log('[Deepgram] Transcription successful, length:', transcript.length);
    return transcript;
  } catch (error) {
    console.error('[Deepgram] Transcription error:', error);
    
    // Provide more context in error message
    if (error instanceof Error) {
      throw new Error(`Deepgram transcription failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generate TTS audio using Deepgram Aura (premium voice)
 * Uses aura-asteria-en model for professional, calm, lawyer-safe voice
 * 
 * @param text - Text to convert to speech (use short sentences for best results)
 * @returns Buffer containing WAV audio data
 */
export async function generateTTS(text: string): Promise<Buffer> {
  try {
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY not configured');
    }

    // Use MP3 - Twilio's most reliable format
    // MP3 is safer than WAV for telephony (no encoding/sample rate issues)
    const response = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mp3', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram TTS failed: ${response.status} ${errorText}`);
    }

    // Deepgram returns MP3
    const audioArrayBuffer = await response.arrayBuffer();
    return Buffer.from(audioArrayBuffer);
  } catch (error) {
    console.error('Deepgram TTS error:', error);
    throw error;
  }
}

