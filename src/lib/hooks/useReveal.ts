'use client';

import { useEffect } from 'react';

/**
 * Adds `.revealed` to `.reveal` elements when they enter the viewport.
 * Pair with landing-page CSS that transitions `.reveal` -> `.reveal.revealed`.
 */
export function useReveal(selector = '.reveal') {
  useEffect(() => {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [selector]);
}
