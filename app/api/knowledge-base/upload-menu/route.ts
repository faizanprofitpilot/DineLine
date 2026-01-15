import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/clients/supabase';
import { openai } from '@/lib/clients/openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
];

/**
 * Upload and process menu file
 * POST /api/knowledge-base/upload-menu
 * Body: FormData with file and restaurantId
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const restaurantId = formData.get('restaurantId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 });
    }

    // Validate file type - only images allowed
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not supported. Please upload JPEG, PNG, or HEIC image files.` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify restaurant exists and user has access
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, ai_knowledge_base')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Process image using OpenAI Vision API
    // Convert image to base64 for Vision API
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Use OpenAI Vision API (gpt-4o) to extract menu items with prices
    // Use high max_tokens to ensure we get the full menu
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are extracting a complete restaurant menu from an image. Your task is to list EVERY SINGLE menu item visible in the image.

CRITICAL: Extract ALL items. Do not stop after one category or a few items. Continue until you have listed every menu item on the entire page.

Format:
## Category Name
- Item Name - Price - Description
- Item Name - Price - Description

## Next Category
- Item Name - Price - Description

Continue listing ALL categories and ALL items until the entire menu is extracted.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 16000, // Increased significantly for large menus
    });

    const rawContent = response.choices[0]?.message?.content || '';
    const finishReason = response.choices[0]?.finish_reason;
    
    // Check if response was truncated
    if (finishReason === 'length') {
      console.error('[Menu Upload] ⚠️ Response was TRUNCATED due to token limit!');
      console.error('[Menu Upload] Menu is too large. Response was cut off.');
      return NextResponse.json(
        { 
          error: 'Menu is too large and was truncated. Please try uploading a smaller section of the menu, or split it into multiple images.',
          extractedContent: rawContent,
          truncated: true
        },
        { status: 400 }
      );
    }
    
    // Remove any introductory text that OpenAI might add
    let extractedContent = rawContent
      .replace(/^Here'?s?\s+(a\s+)?(structured\s+)?(list\s+of\s+)?(the\s+)?(menu\s+items?\s+)?(extracted\s+from\s+the\s+image)?:?\s*/i, '')
      .replace(/^Here\s+are\s+(the\s+)?(menu\s+items?\s+)?(extracted\s+from\s+the\s+image)?:?\s*/i, '')
      .replace(/^(Based\s+on\s+the\s+image|From\s+the\s+menu\s+image|I'?ve\s+extracted|The\s+menu\s+contains):?\s*/i, '')
      .trim();
    
    // Log the full response for debugging
    console.log('[Menu Upload] Response length:', extractedContent.length, 'chars');
    console.log('[Menu Upload] Finish reason:', finishReason);
    console.log('[Menu Upload] First 1000 chars:', extractedContent.substring(0, 1000));
    console.log('[Menu Upload] Last 500 chars:', extractedContent.substring(Math.max(0, extractedContent.length - 500)));
    
    // If content is suspiciously short, warn
    if (extractedContent.length < 500) {
      console.error('[Menu Upload] ⚠️ WARNING: Extracted content is very short!');
      console.error('[Menu Upload] Full raw response:', rawContent);
    }

    if (!extractedContent) {
      return NextResponse.json(
        { error: 'Failed to extract content from menu file' },
        { status: 500 }
      );
    }

    // Parse existing knowledge base to update only the cuisine section
    const existingKB = (restaurant as any).ai_knowledge_base || '';
    let updatedKB = existingKB;

    // Try to find and replace the cuisine section
    // Use a more precise regex that won't accidentally match other sections
    const cuisineRegex = /##\s+Cuisine(?:\s+&\s+Popular\s+Items)?[:\s]*\n([\s\S]*?)(?=\n##\s+(?:Dietary|Location|Hours|Policies)|$)/i;
    const cuisineMatch = existingKB.match(cuisineRegex);

    if (cuisineMatch) {
      // Replace existing cuisine section - preserve the exact header format
      updatedKB = existingKB.replace(
        cuisineRegex,
        `## Cuisine & Popular Items\n${extractedContent.trim()}\n\n`
      );
    } else {
      // If no cuisine section exists, add it at the beginning
      const sections = existingKB.trim();
      updatedKB = `## Cuisine & Popular Items\n${extractedContent.trim()}\n\n${sections ? '\n' + sections : ''}`;
    }
    
    // Log what we're saving
    console.log('[Menu Upload] Saving knowledge base, length:', updatedKB.length);
    console.log('[Menu Upload] Cuisine section length:', extractedContent.length);

    // Update restaurant knowledge base
    const { error: updateError } = await supabase
      .from('restaurants')
      // @ts-ignore - Supabase type inference issue
      .update({ ai_knowledge_base: updatedKB })
      .eq('id', restaurantId);

    if (updateError) {
      console.error('Error updating knowledge base:', updateError);
      return NextResponse.json(
        { error: 'Failed to update knowledge base' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      extractedContent,
      message: 'Menu uploaded and processed successfully. Dishes have been added to your knowledge base.',
    });
  } catch (error) {
    console.error('Error processing menu upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process menu file' },
      { status: 500 }
    );
  }
}

