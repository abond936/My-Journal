'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface Section {
  id: string;
  title: string;
  level: number;
  pageId: string;
}

export default function SectionNavigation() {
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const loadSections = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('Fetching sections...');
        const response = await fetch('/api/sections');
        console.log('Sections response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load sections');
        }
        
        const data = await response.json();
        console.log('Received sections:', data);
        
        // Ensure we have valid section IDs and sort by level
        const validSections = (data.sections || [])
          .filter((section: Section) => {
            const isValid = typeof section.id === 'string' && section.id.length > 0;
            if (!isValid) {
              console.warn('Invalid section found:', section);
            }
            return isValid;
          })
          .sort((a: Section, b: Section) => {
            // First sort by level
            if (a.level !== b.level) {
              return a.level - b.level;
            }
            // Then by title
            return a.title.localeCompare(b.title);
          });
        
        console.log('Valid sections:', validSections);
        setSections(validSections);

        // If we're on the root edit page, redirect to the first section
        if (pathname === '/edit') {
          const firstSection = validSections[0];
          if (firstSection) {
            console.log('Redirecting to first section:', firstSection.id);
            router.push(`/edit/${firstSection.id}`);
          }
        }
      } catch (error) {
        console.error('Error loading sections:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    loadSections();
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading sections...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error: {error}
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No sections found
      </div>
    );
  }

  return (
    <nav className="overflow-y-auto h-[calc(100vh-64px)]">
      <ul className="space-y-1">
        {sections.map((section) => {
          const sectionPath = `/edit/${section.id}`;
          const isActive = pathname === sectionPath;
          console.log(`Creating link for section: ${section.id} -> ${sectionPath} (active: ${isActive})`);
          
          return (
            <li key={section.id}>
              <Link
                href={sectionPath}
                className={`block px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700'
                }`}
                style={{ 
                  marginLeft: `${(section.level - 1) * 1}rem`,
                  fontWeight: section.level === 1 ? '600' : 'normal'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  console.log(`Navigating to section: ${section.id}`);
                  router.push(sectionPath);
                }}
              >
                {section.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
} 