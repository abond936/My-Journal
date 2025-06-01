'use client';

import styles from './TagColorsTest.module.css';

const tagCategories = {
  'Who': {
    color: 'var(--color-primary)',
    light: 'var(--color-primary-light)',
    dark: 'var(--color-primary-dark)',
    tags: ['Family', 'Friends', 'Colleagues', 'Mentors']
  },
  'What': {
    color: 'var(--color-secondary)',
    light: 'var(--color-secondary-light)',
    dark: 'var(--color-secondary-dark)',
    tags: ['Work', 'Hobbies', 'Projects', 'Events']
  },
  'When': {
    color: 'var(--color-accent)',
    light: 'var(--color-accent-light)',
    dark: 'var(--color-accent-dark)',
    tags: ['Morning', 'Afternoon', 'Evening', 'Night']
  },
  'Where': {
    color: 'var(--color-info)',
    light: 'var(--color-info-light)',
    dark: 'var(--color-info-dark)',
    tags: ['Home', 'Office', 'Nature', 'Travel']
  },
  'Reflection': {
    color: 'var(--color-warning)',
    light: 'var(--color-warning-light)',
    dark: 'var(--color-warning-dark)',
    tags: ['Insights', 'Learnings', 'Goals', 'Growth']
  }
};

export default function TagColorsTest() {
  return (
    <div className={styles.container}>
      <h1>Tag Color System</h1>
      
      <div className={styles.categoryGrid}>
        {Object.entries(tagCategories).map(([category, { color, light, dark, tags }]) => (
          <div key={category} className={styles.category}>
            <h2 style={{ color }}>{category}</h2>
            <div className={styles.colorStrip}>
              <div className={styles.colorBox} style={{ backgroundColor: light }}>Light</div>
              <div className={styles.colorBox} style={{ backgroundColor: color }}>Base</div>
              <div className={styles.colorBox} style={{ backgroundColor: dark }}>Dark</div>
            </div>
            <div className={styles.tags}>
              {tags.map(tag => (
                <span 
                  key={tag} 
                  className={styles.tag}
                  style={{ 
                    backgroundColor: light,
                    color: dark,
                    borderColor: color
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <h2>Tag Usage Examples</h2>
        <div className={styles.examples}>
          <div className={styles.example}>
            <h3>Tag Cloud</h3>
            <div className={styles.tagCloud}>
              {Object.entries(tagCategories).map(([category, { color, tags }]) => (
                tags.map(tag => (
                  <span 
                    key={tag} 
                    className={styles.cloudTag}
                    style={{ 
                      backgroundColor: color,
                      opacity: 0.8
                    }}
                  >
                    {tag}
                  </span>
                ))
              ))}
            </div>
          </div>

          <div className={styles.example}>
            <h3>Tag Selection</h3>
            <div className={styles.tagSelection}>
              {Object.entries(tagCategories).map(([category, { color, light, tags }]) => (
                <div key={category} className={styles.selectionGroup}>
                  <h4 style={{ color }}>{category}</h4>
                  <div className={styles.selectionTags}>
                    {tags.map(tag => (
                      <label key={tag} className={styles.selectionTag}>
                        <input type="checkbox" />
                        <span style={{ 
                          borderColor: color,
                          backgroundColor: light
                        }}>
                          {tag}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 