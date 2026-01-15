import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// CRITICAL: Must be dynamic and use nodejs runtime for audio serving
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Endpoint to serve a short typing/thinking sound
 * This plays while the agent is processing the user's input
 * 
 * Uses a real typing sound file from /public/audio/typing.wav
 * Falls back to a simple beep if file not found
 */
export async function GET(request: NextRequest) {
  try {
    // Try to load real typing sound from public directory
    try {
      const typingSoundPath = join(process.cwd(), 'public', 'audio', 'typing.wav');
      const typingSound = await readFile(typingSoundPath);
      
      return new NextResponse(typingSound, {
        status: 200,
        headers: {
          'Content-Type': 'audio/x-wav',
          'Content-Length': typingSound.length.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (fileError) {
      // File not found, use a public typing sound URL as fallback
      // Using a free typing sound from a CDN
      const typingSoundUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      
      // For now, redirect to a real typing sound or generate a simple one
      // Using a very short, subtle typing sound from a reliable source
      // You can replace this URL with your own hosted typing sound
      const fallbackUrl = 'https://assets.mixkit.co/sfx/preview/mixkit-typewriter-key-1-1034.mp3';
      
      // Since we can't redirect in Twilio, generate a realistic typing sound
      // This creates a more natural keyboard typing pattern
      const sampleRate = 16000; // Higher sample rate for better quality
      const duration = 1.0; // 1 second
      const numSamples = Math.floor(sampleRate * duration);
      
      // Generate realistic typing sound: irregular keyboard clicks with varying pitches
      const samples: number[] = [];
      // Create irregular typing pattern (not perfectly spaced)
      const clickTimes = [0.08, 0.18, 0.31, 0.42, 0.55, 0.68, 0.82, 0.95]; // Irregular spacing
      const clickPitches = [440, 523, 392, 494, 440, 370, 440, 523]; // Varying pitches (Hz)
      
      for (let i = 0; i < numSamples; i++) {
        const time = i / sampleRate;
        let amplitude = 0;
        
        // Add clicks at specified times with varying pitches
        for (let j = 0; j < clickTimes.length; j++) {
          const clickTime = clickTimes[j];
          const pitch = clickPitches[j];
          const timeFromClick = Math.abs(time - clickTime);
          
          if (timeFromClick < 0.03) { // 30ms click duration
            // Create a more realistic click with pitch
            const clickAmplitude = Math.exp(-timeFromClick * 80) * 0.2;
            // Add pitch variation (sine wave at click frequency)
            const pitchWave = Math.sin(2 * Math.PI * pitch * time) * clickAmplitude;
            amplitude += pitchWave;
          }
        }
        
        // Add very subtle background noise (keyboard mechanical sound)
        amplitude += (Math.random() - 0.5) * 0.01;
        
        samples.push(Math.max(-1, Math.min(1, amplitude)));
      }
      
      // Convert to 16-bit PCM
      const pcmData = Buffer.allocUnsafe(numSamples * 2);
      for (let i = 0; i < numSamples; i++) {
        const intSample = Math.floor(samples[i] * 32767);
        pcmData.writeInt16LE(intSample, i * 2);
      }
      
      // WAV header
      const dataSize = numSamples * 2;
      const fileSize = 36 + dataSize;
      
      const wavHeader = Buffer.alloc(44);
      wavHeader.write('RIFF', 0);
      wavHeader.writeUInt32LE(fileSize, 4);
      wavHeader.write('WAVE', 8);
      wavHeader.write('fmt ', 12);
      wavHeader.writeUInt32LE(16, 16); // Subchunk1Size
      wavHeader.writeUInt16LE(1, 20); // AudioFormat (PCM)
      wavHeader.writeUInt16LE(1, 22); // NumChannels (mono)
      wavHeader.writeUInt32LE(sampleRate, 24); // SampleRate
      wavHeader.writeUInt32LE(sampleRate * 2, 28); // ByteRate
      wavHeader.writeUInt16LE(2, 32); // BlockAlign
      wavHeader.writeUInt16LE(16, 34); // BitsPerSample
      wavHeader.write('data', 36);
      wavHeader.writeUInt32LE(dataSize, 40);
      
      const wavFile = Buffer.concat([wavHeader, pcmData]);

      return new NextResponse(wavFile, {
        status: 200,
        headers: {
          'Content-Type': 'audio/x-wav',
          'Content-Length': wavFile.length.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  } catch (error) {
    console.error('[Typing Audio] Error:', error);
    // Return empty response on error
    return new NextResponse(null, { 
      status: 404,
      headers: {
        'Content-Type': 'audio/x-wav',
      },
    });
  }
}

