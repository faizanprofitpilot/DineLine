'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Upload, FileText, Loader2 } from 'lucide-react';

interface KnowledgeBaseSectionsProps {
  restaurant: any;
  onSave?: () => void;
}

interface SectionState {
  cuisine: string;
  dietary: string;
  location: string;
  policies: string;
}

export default function KnowledgeBaseSections({ restaurant, onSave }: KnowledgeBaseSectionsProps) {
  const [sections, setSections] = useState<SectionState>({
    cuisine: '',
    dietary: '',
    location: '',
    policies: '',
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    cuisine: true,
    dietary: false,
    location: false,
    policies: false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Parse existing knowledge base content if it exists
    if (restaurant?.ai_knowledge_base) {
      const content = restaurant.ai_knowledge_base;
      
      // Try to parse sections (if they're marked with headers)
      // Match "## Cuisine & Popular Items" - the API saves it exactly as "## Cuisine & Popular Items\n"
      // IMPORTANT: Stop only at knowledge base section headers (Dietary, Location, Policies), NOT at menu category headers (Soup, Salads, etc.)
      // Use [\s\S] to match across newlines, and stop at specific section headers or end of string
      const cuisineMatch = content.match(/##\s+Cuisine\s+&\s+Popular\s+Items\s*\n([\s\S]*?)(?=\n##\s+(?:Dietary|Location|Hours|Policies)|$)/i) ||
                           content.match(/##\s+Cuisine[:\s]*\n([\s\S]*?)(?=\n##\s+(?:Dietary|Location|Hours|Policies)|$)/i);
      const dietaryMatch = content.match(/##\s+Dietary\s+Options?\s+&\s+Allergens?\s*\n([\s\S]*?)(?=\n##\s+|$)/i) ||
                           content.match(/##\s+Dietary[:\s]*\n([\s\S]*?)(?=\n##\s+|$)/i);
      const locationMatch = content.match(/##\s+Hours,?\s+Location,?\s+Parking\s*\n([\s\S]*?)(?=\n##\s+|$)/i) ||
                           content.match(/##\s+Location[:\s]*\n([\s\S]*?)(?=\n##\s+|$)/i);
      const policiesMatch = content.match(/##\s+Policies?\s*\n([\s\S]*?)(?=\n##\s+|$)/i);

      // Helper function to clean extracted content
      const cleanContent = (text: string | undefined): string => {
        if (!text) return '';
        let cleaned = text.trim();
        
        // Remove common default/placeholder text
        const defaultTexts = [
          'Not specified',
          '& Popular Items',
          'Popular Items',
          'Options & Allergens',
          'Options',
          'Allergens',
        ];
        
        // Check if content is just default text
        if (defaultTexts.some(defaultText => 
          cleaned === defaultText || 
          cleaned.toLowerCase() === defaultText.toLowerCase() ||
          cleaned.match(new RegExp(`^(${defaultText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|Not\\s+specified)$`, 'i'))
        )) {
          return '';
        }
        
        // Remove if content is just partial header text or repeated default text
        if (cleaned.match(/^(&\s*Popular\s*Items|Options?\s*&\s*Allergens?|Not\s+specified)(\s+(&\s*Popular\s*Items|Options?\s*&\s*Allergens?|Not\s+specified))*$/i)) {
          return '';
        }
        
        // Remove if content is just whitespace or newlines
        if (!cleaned || cleaned.match(/^\s*$/)) {
          return '';
        }
        
        return cleaned;
      };

      setSections({
        cuisine: cleanContent(cuisineMatch?.[1]),
        dietary: cleanContent(dietaryMatch?.[1]),
        location: cleanContent(locationMatch?.[1]),
        policies: cleanContent(policiesMatch?.[1]),
      });

      // If no sections found, try to infer from plain text (optional - can skip)
      // For now, if no sections found, leave empty
    } else {
      // Reset sections if no knowledge base exists
      setSections({
        cuisine: '',
        dietary: '',
        location: '',
        policies: '',
      });
    }
  }, [restaurant?.ai_knowledge_base]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Combine sections into markdown format
      // Only include sections that have content
      const sectionsArray: string[] = [];
      
      if (sections.cuisine.trim()) {
        sectionsArray.push(`## Cuisine & Popular Items\n${sections.cuisine.trim()}`);
      }
      
      if (sections.dietary.trim()) {
        sectionsArray.push(`## Dietary Options & Allergens\n${sections.dietary.trim()}`);
      }
      
      if (sections.location.trim()) {
        sectionsArray.push(`## Hours, Location, Parking\n${sections.location.trim()}`);
      }
      
      if (sections.policies.trim()) {
        sectionsArray.push(`## Policies\n${sections.policies.trim()}`);
      }
      
      const combinedContent = sectionsArray.join('\n\n');

      const supabase = (await import('@/lib/clients/supabase')).createBrowserClient();
      const { error } = await supabase
        .from('restaurants')
        // @ts-ignore - Supabase type inference issue
        .update({ ai_knowledge_base: combinedContent })
        .eq('id', restaurant.id);

      if (error) {
        throw error;
      }

      // Update Vapi assistant if it exists to include the new knowledge base
      if (restaurant.vapi_assistant_id) {
        try {
          const updateResponse = await fetch('/api/vapi/update-assistant', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ restaurantId: restaurant.id }),
          });

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.warn('Assistant update warning:', errorData);
            // Don't throw - settings are saved, assistant update is best-effort
          } else {
            console.log('Vapi assistant updated with new knowledge base');
          }
        } catch (updateError) {
          console.warn('Error updating assistant (non-blocking):', updateError);
          // Don't throw - settings are saved, assistant update is best-effort
        }
      }

      if (onSave) {
        onSave();
      }
      
      alert('Knowledge base saved successfully');
    } catch (error) {
      console.error('Error saving knowledge base:', error);
      alert('Failed to save knowledge base');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateSection = (section: keyof SectionState, value: string) => {
    setSections(prev => ({ ...prev, [section]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !restaurant?.id) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('restaurantId', restaurant.id);

      const response = await fetch('/api/knowledge-base/upload-menu', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload menu');
      }

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 5000);

      // Wait for database write to complete, then reload to get fresh data
      // The API has already saved to database, so we just need to refresh
      setTimeout(() => {
        if (onSave) {
          onSave(); // Trigger parent refresh if callback provided
        }
        // Reload to get fresh data from database with updated knowledge base
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error uploading menu:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload menu');
      setUploadedFileName(null);
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const sectionConfig = [
    {
      key: 'cuisine' as const,
      title: 'Cuisine & Popular Items',
      placeholder: 'Describe your cuisine type, signature dishes, popular items, specialties...',
      icon: '🍽️',
    },
    {
      key: 'dietary' as const,
      title: 'Dietary Options & Allergens',
      placeholder: 'List dietary options (vegetarian, vegan, gluten-free) and allergen information...',
      icon: '🥗',
    },
    {
      key: 'location' as const,
      title: 'Hours, Location, Parking',
      placeholder: 'Address, parking options, operating hours, location details...',
      icon: '📍',
    },
    {
      key: 'policies' as const,
      title: 'Policies',
      placeholder: 'Reservation policies, delivery radius, cancellation policy, special requests...',
      icon: '📋',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Menu Upload Section */}
      <div
        className="border rounded-xl overflow-hidden"
        style={{ borderColor: '#DEB887' }}
      >
        <div className="p-4" style={{ backgroundColor: '#FFF8DC' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" style={{ color: '#8B4513' }} />
              <h3 className="text-base font-semibold" style={{ color: '#654321' }}>
                Upload Menu
              </h3>
            </div>
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: uploading ? '#A0522D' : '#8B4513',
                color: '#FFFFFF',
              }}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Menu
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          <p className="text-xs" style={{ color: '#A0522D', opacity: 0.7 }}>
            Upload a JPEG, PNG, or HEIC menu image. AI will automatically extract dishes with prices and add them to "Cuisine & Popular Items".
          </p>
          {uploadedFileName && (
            <div className="mt-3 p-2 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs" style={{ color: '#654321' }}>
                <span className="font-medium">Uploaded:</span> {uploadedFileName}
              </p>
            </div>
          )}
          {uploadError && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{uploadError}</p>
            </div>
          )}
          {uploadSuccess && (
            <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm text-green-700">
                Menu processed successfully! Dishes have been added to your knowledge base.
              </p>
            </div>
          )}
        </div>
      </div>

      {sectionConfig.map((section) => (
        <div
          key={section.key}
          className="border rounded-xl overflow-hidden"
          style={{ borderColor: '#DEB887' }}
        >
          <button
            onClick={() => toggleSection(section.key)}
            className="w-full flex items-center justify-between p-4 transition-colors cursor-pointer"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF0C2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = expanded[section.key] ? '#FFF8DC' : '#FFFFFF'}
            style={{ backgroundColor: expanded[section.key] ? '#FFF8DC' : '#FFFFFF' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{section.icon}</span>
              <h3 className="text-base font-semibold" style={{ color: '#654321' }}>
                {section.title}
              </h3>
            </div>
            {expanded[section.key] ? (
              <ChevronUp className="h-5 w-5" style={{ color: '#8B4513' }} />
            ) : (
              <ChevronDown className="h-5 w-5" style={{ color: '#8B4513' }} />
            )}
          </button>

          {expanded[section.key] && (
            <div className="p-4 border-t" style={{ borderColor: '#DEB887', backgroundColor: '#FFFFFF' }}>
              <textarea
                value={sections[section.key]}
                onChange={(e) => updateSection(section.key, e.target.value)}
                placeholder={section.placeholder}
                rows={6}
                className="w-full p-3 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all placeholder:opacity-50"
                style={{
                  borderColor: '#DEB887',
                  backgroundColor: '#FFFDF7',
                  color: sections[section.key] ? '#654321' : '#A0522D',
                  '--tw-ring-color': '#FF8C42',
                } as React.CSSProperties}
              />
              <p className="text-xs mt-2" style={{ color: '#A0522D', opacity: 0.7 }}>
                This information helps the AI receptionist answer customer questions accurately.
              </p>
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-lg font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#8B4513' }}
        >
          {saving ? 'Saving...' : 'Save Knowledge Base'}
        </button>
      </div>
    </div>
  );
}

