import type { ReactNode } from 'react';
import { Figtree, Fraunces, Newsreader } from 'next/font/google';
import './living-album.css';

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['italic'],
  weight: ['400', '500'],
  display: 'swap',
});

export default function LandingPageFourLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${figtree.className} ${fraunces.className} ${newsreader.className}`}>
      {children}
    </div>
  );
}
