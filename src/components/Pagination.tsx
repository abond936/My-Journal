'use client'; // This marks it as a client component

import { useEffect } from 'react';

export default function Pagination() {
  useEffect(() => {
    // Get all page elements
    const pages = document.querySelectorAll('.page');
    
    // If no pages found, exit early
    if (pages.length === 0) return;
    
    const totalPages = pages.length;
    
    // Get navigation elements
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const currentPageIndicator = document.getElementById('current-page');
    const totalPagesIndicator = document.getElementById('total-pages');
    
    // Set total pages in indicator
    if (totalPagesIndicator) {
      totalPagesIndicator.textContent = totalPages.toString();
    }
    
    // Track current page
    let currentPageIndex = 0;
    
    // Initialize page visibility
    updatePageVisibility();
    
    // Add event listeners to buttons if they exist
    if (prevButton) {
      prevButton.addEventListener('click', showPreviousPage);
    }
    
    if (nextButton) {
      nextButton.addEventListener('click', showNextPage);
    }
    
    function showPreviousPage() {
      if (currentPageIndex > 0) {
        // Determine how many pages to move back based on screen size
        const isDesktop = window.innerWidth >= 1400;
        currentPageIndex -= isDesktop ? 2 : 1;
        if (currentPageIndex < 0) currentPageIndex = 0;
        updatePageVisibility();
      }
    }
    
    function showNextPage() {
      const isDesktop = window.innerWidth >= 1400;
      const maxIndex = isDesktop ? 
        totalPages - (totalPages % 2 || 2) : // Handle odd number of pages
        totalPages - 1;
      
      if (currentPageIndex < maxIndex) {
        currentPageIndex += isDesktop ? 2 : 1;
        updatePageVisibility();
      }
    }
    
    function updatePageVisibility() {
      // Update current page indicator if it exists
      if (currentPageIndicator) {
        currentPageIndicator.textContent = (currentPageIndex + 1).toString();
      }
      
      // Update button states if they exist
      if (prevButton) {
        prevButton.disabled = currentPageIndex === 0;
      }
      
      if (nextButton) {
        const isDesktop = window.innerWidth >= 1400;
        const maxIndex = isDesktop ? 
          totalPages - (totalPages % 2 || 2) : 
          totalPages - 1;
        nextButton.disabled = currentPageIndex >= maxIndex;
      }
      
      // Update page visibility based on current layout
      const isDesktop = window.innerWidth >= 1400;
      
      pages.forEach((page, index) => {
        if (isDesktop) {
          // On desktop: show current page and next page (two-page spread)
          (page as HTMLElement).style.display = (index === currentPageIndex || index === currentPageIndex + 1) ? 'block' : 'none';
        } else {
          // On mobile/tablet: show only current page
          (page as HTMLElement).style.display = index === currentPageIndex ? 'block' : 'none';
        }
      });
    }
    
    // Handle window resize to adjust for responsive layout changes
    window.addEventListener('resize', updatePageVisibility);
    
    // Cleanup function to remove event listeners
    return () => {
      if (prevButton) {
        prevButton.removeEventListener('click', showPreviousPage);
      }
      if (nextButton) {
        nextButton.removeEventListener('click', showNextPage);
      }
      window.removeEventListener('resize', updatePageVisibility);
    };
  }, []); // Empty dependency array means this runs once on mount
  
  return null; // This component doesn't render anything
}