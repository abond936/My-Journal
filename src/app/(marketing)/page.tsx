import type { Metadata } from 'next';
import LivingAlbumLanding from '@/components/marketing/LivingAlbumLanding';

export const metadata: Metadata = {
  title: 'My Stories — The Living Album',
  description:
    'Combine your photos and stories into a beautiful, private, shareable feed for family and friends.',
};

export default function HomePage() {
  return <LivingAlbumLanding />;
}
