// components/NavigationSidebar.jsx
import { useState } from 'react';
import Link from 'next/link';
import styles from './NavigationSidebar.module.css';

const NavigationSidebar = ({ 
  people = [], 
  places = [], 
  events = [], 
  themes = [],
  activeDimension = null,
  activeItem = null
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    people: true,
    places: true,
    events: true,
    time: true,
    themes: true
  });

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  // Generate years list from current year back to 1950 (adjust as needed)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i);

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Memoir Navigator</h2>
        <button 
          className={styles.collapseButton} 
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? '›' : '‹'}
        </button>
      </div>

      <nav className={styles.sidebarNav}>
        {/* People section */}
        <div className={styles.navSection}>
          <div 
            className={styles.sectionHeader} 
            onClick={() => toggleSection('people')}
          >
            <h3 className={styles.sectionTitle}>People</h3>
            <span className={styles.expandIcon}>
              {expandedSections.people ? '▼' : '►'}
            </span>
          </div>
          
          {expandedSections.people && (
            <ul className={styles.navList}>
              {people.map(person => (
                <li key={person.id} className={styles.navItem}>
                  <Link href={`/people/${encodeURIComponent(person.id)}`}>
                    <a className={`${styles.navLink} ${activeDimension === 'people' && activeItem === person.id ? styles.active : ''}`}>
                      {person.name}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Places section */}
        <div className={styles.navSection}>
          <div 
            className={styles.sectionHeader} 
            onClick={() => toggleSection('places')}
          >
            <h3 className={styles.sectionTitle}>Places</h3>
            <span className={styles.expandIcon}>
              {expandedSections.places ? '▼' : '►'}
            </span>
          </div>
          
          {expandedSections.places && (
            <ul className={styles.navList}>
              {places.map(place => (
                <li key={place.id} className={styles.navItem}>
                  <Link href={`/places/${encodeURIComponent(place.id)}`}>
                    <a className={`${styles.navLink} ${activeDimension === 'places' && activeItem === place.id ? styles.active : ''}`}>
                      {place.name}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Events section */}
        <div className={styles.navSection}>
          <div 
            className={styles.sectionHeader} 
            onClick={() => toggleSection('events')}
          >
            <h3 className={styles.sectionTitle}>Events</h3>
            <span className={styles.expandIcon}>
              {expandedSections.events ? '▼' : '►'}
            </span>
          </div>
          
          {expandedSections.events && (
            <ul className={styles.navList}>
              {events.map(event => (
                <li key={event.id} className={styles.navItem}>
                  <Link href={`/events/${encodeURIComponent(event.id)}`}>
                    <a className={`${styles.navLink} ${activeDimension === 'events' && activeItem === event.id ? styles.active : ''}`}>
                      {event.name}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Time section */}
        <div className={styles.navSection}>
          <div 
            className={styles.sectionHeader} 
            onClick={() => toggleSection('time')}
          >
            <h3 className={styles.sectionTitle}>Time</h3>
            <span className={styles.expandIcon}>
              {expandedSections.time ? '▼' : '►'}
            </span>
          </div>
          
          {expandedSections.time && (
            <ul className={styles.navList}>
              {years.map(year => (
                <li key={year} className={styles.navItem}>
                  <Link href={`/time/${year}`}>
                    <a className={`${styles.navLink} ${activeDimension === 'time' && activeItem === year.toString() ? styles.active : ''}`}>
                      {year}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Themes section */}
        <div className={styles.navSection}>
          <div 
            className={styles.sectionHeader} 
            onClick={() => toggleSection('themes')}
          >
            <h3 className={styles.sectionTitle}>Themes</h3>
            <span className={styles.expandIcon}>
              {expandedSections.themes ? '▼' : '►'}
            </span>
          </div>
          
          {expandedSections.themes && (
            <ul className={styles.navList}>
              {themes.map(theme => (
                <li key={theme.id} className={styles.navItem}>
                  <Link href={`/themes/${encodeURIComponent(theme.id)}`}>
                    <a className={`${styles.navLink} ${activeDimension === 'themes' && activeItem === theme.id ? styles.active : ''}`}>
                      {theme.name}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>
    </aside>
  );
};

export default NavigationSidebar;