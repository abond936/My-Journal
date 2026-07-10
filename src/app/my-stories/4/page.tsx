import type { Metadata } from 'next';
import LivingAlbumLanding from './LivingAlbumLanding';

export const metadata: Metadata = {
  title: 'My Stories - Landing Page 4',
  description:
    'The Living Album — a warm editorial landing page for My Stories with photo-print layouts and memoir-oriented copy.',
};

export default function LandingPageFour() {
  return <LivingAlbumLanding />;
}
