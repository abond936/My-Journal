'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditPage() {
  const router = useRouter();

  useEffect(() => {
    const loadFirstSection = async () => {
      try {
        console.log('Loading first section...');
        const response = await fetch('/api/sections');
        if (!response.ok) {
          throw new Error('Failed to load sections');
        }
        
        const data = await response.json();
        const firstSection = data.sections[0];
        
        if (firstSection) {
          console.log('Redirecting to first section:', firstSection.id);
          router.push(`/edit/${firstSection.id}`);
        } else {
          console.error('No sections found');
        }
      } catch (error) {
        console.error('Error loading first section:', error);
      }
    };

    loadFirstSection();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-xl">Loading first section...</div>
        <div className="text-gray-500">Please wait while we redirect you</div>
      </div>
    </div>
  );
} 