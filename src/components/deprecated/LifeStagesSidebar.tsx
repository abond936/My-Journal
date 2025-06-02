'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/lib/styles/components/deprecated/LifeStagesSidebar.module.css';

interface Section {
  id: string;
  title: string;
  subsections: Array<{
    id: string;
    title: string;
    href: string;
  }>;
}

const sections: Section[] = [
  {
    id: 'ancestry',
    title: 'Ancestry',
    subsections: [
      {
        id: 'my-birth',
        title: 'My Birth',
        href: '/family-history/my-birth'
      }
    ]
  },
  {
    id: 'childhood',
    title: 'Childhood',
    subsections: [
      {
        id: 'early-years',
        title: 'Early Years',
        href: '/childhood/early-years'
      },
      {
        id: 'school-years',
        title: 'School Years',
        href: '/childhood/school-years'
      }
    ]
  },
  {
    id: 'adolescence',
    title: 'Adolescence',
    subsections: [
      {
        id: 'teen-years',
        title: 'Teen Years',
        href: '/adolescence/teen-years'
      },
      {
        id: 'high-school',
        title: 'High School',
        href: '/adolescence/high-school'
      }
    ]
  },
  {
    id: 'young-adulthood',
    title: 'Young Adulthood',
    subsections: [
      {
        id: 'college',
        title: 'College',
        href: '/young-adulthood/college'
      },
      {
        id: 'first-job',
        title: 'First Job',
        href: '/young-adulthood/first-job'
      }
    ]
  },
  {
    id: 'adulthood',
    title: 'Adulthood',
    subsections: [
      {
        id: 'career',
        title: 'Career',
        href: '/adulthood/career'
      },
      {
        id: 'family',
        title: 'Family',
        href: '/adulthood/family'
      }
    ]
  }
];

export default function LifeStagesSidebar() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['ancestry']));
  const pathname = usePathname();

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navigation}>
        {sections.map((section) => (
          <div key={section.id} className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection(section.id)}
              aria-expanded={expandedSections.has(section.id)}
            >
              <h3>{section.title}</h3>
              <span className={styles.expandIcon}>
                {expandedSections.has(section.id) ? '−' : '+'}
              </span>
            </button>
            
            {expandedSections.has(section.id) && (
              <ul className={styles.subsectionList}>
                {section.subsections.map((subsection) => (
                  <li key={subsection.id}>
                    <Link 
                      href={subsection.href}
                      className={pathname === subsection.href ? styles.active : ''}
                    >
                      {subsection.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
} 