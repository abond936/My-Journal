'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { JournalPage } from '@/lib/journal';
import { getAllJournalPages } from '@/lib/journal';
import { useAuth } from '@/lib/auth';

export default function EditPage() {
  const { sectionId } = useParams();
  const [content, setContent] = useState<JournalPage | null>(null);
  const [sections, setSections] = useState<JournalPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadContent = async () => {
      if (!sectionId) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/content/${sectionId}`);
        if (!response.ok) throw new Error('Failed to fetch content');
        const data = await response.json();
        
        // Ensure the data matches our JournalPage interface
        const pageData: JournalPage = {
          id: data.id || sectionId,
          heading: {
            title: data.heading?.title || 'Untitled',
            metadata: data.heading?.metadata || {}
          },
          content: data.content || '',
          mainContent: data.mainContent || []
        };
        
        setContent(pageData);
      } catch (error) {
        console.error('Error loading content:', error);
        setError(error instanceof Error ? error.message : 'Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };

    const loadSections = async () => {
      try {
        const pages = await getAllJournalPages();
        // Ensure each section has the required structure
        const validatedPages = pages.map(page => ({
          id: page.id || '',
          heading: {
            title: page.heading?.title || 'Untitled',
            metadata: page.heading?.metadata || {}
          },
          content: page.content || '',
          mainContent: page.mainContent || []
        }));
        setSections(validatedPages);
      } catch (error) {
        console.error('Error loading sections:', error);
        setError('Failed to load sections');
      }
    };

    loadContent();
    loadSections();
  }, [sectionId]);

  const handleContentChange = async (newContent: string) => {
    if (!content) return;

    try {
      const response = await fetch(`/api/content/${sectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...content,
          content: newContent,
        }),
      });

      if (!response.ok) throw new Error('Failed to update content');
      const updatedContent = await response.json();
      setContent(updatedContent);
    } catch (error) {
      console.error('Error updating content:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading content...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">No content found</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left side - Editor */}
      <div className="w-1/2 p-6 bg-white border-r border-gray-200 flex flex-col">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">{content.heading.title}</h1>
        <textarea
          value={content.content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="flex-1 w-full p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="Start writing your content here..."
        />
      </div>

      {/* Middle - Sections List */}
      <div className="w-1/4 p-6 bg-white border-r border-gray-200 flex flex-col">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">Sections</h2>
        <div className="space-y-2 overflow-y-auto flex-1">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                section.id === sectionId 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {section.heading.title}
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Preview */}
      <div className="w-1/4 p-6 bg-white flex flex-col">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">Preview</h2>
        <div className="prose max-w-none overflow-y-auto flex-1">
          {content.content}
        </div>
      </div>
    </div>
  );
} 