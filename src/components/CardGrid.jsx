// components/CardGrid.jsx
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './CardGrid.module.css';

// This will be your main grid layout for displaying content cards
const CardGrid = ({ cards, filter = null }) => {
  const [filteredCards, setFilteredCards] = useState(cards);
  
  useEffect(() => {
    if (filter) {
      // Filter cards based on selected dimension (people, places, etc.)
      setFilteredCards(cards.filter(card => {
        if (filter.type === 'person' && card.people && card.people.includes(filter.value)) return true;
        if (filter.type === 'place' && card.places && card.places.includes(filter.value)) return true;
        if (filter.type === 'event' && card.events && card.events.includes(filter.value)) return true;
        if (filter.type === 'theme' && card.themes && card.themes.includes(filter.value)) return true;
        if (filter.type === 'time' && card.date) {
          // Example: filter by year, month, etc.
          const cardDate = new Date(card.date);
          const filterDate = new Date(filter.value);
          return cardDate.getFullYear() === filterDate.getFullYear();
        }
        return false;
      }));
    } else {
      setFilteredCards(cards);
    }
  }, [cards, filter]);

  return (
    <div className={styles.gridContainer}>
      {filteredCards.map((card) => (
        <div 
          key={card.id} 
          className={`${styles.card} ${styles[`importance-${card.importance || 'medium'}`]}`}
        >
          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>{card.title}</h3>
            
            {/* Display featured photo if available */}
            {card.featuredPhoto && (
              <div className={styles.cardMedia}>
                <Image 
                  src={card.featuredPhoto.src} 
                  alt={card.featuredPhoto.alt || card.title}
                  width={400}
                  height={300}
                  layout="responsive"
                />
              </div>
            )}
            
            {/* Display excerpt or summary */}
            <p className={styles.cardExcerpt}>{card.excerpt}</p>
            
            {/* Display metadata tags */}
            <div className={styles.cardMeta}>
              {card.date && (
                <span className={styles.cardDate}>
                  {new Date(card.date).toLocaleDateString()}
                </span>
              )}
              
              {/* Display key dimensions as tags */}
              <div className={styles.cardTags}>
                {card.people && card.people.slice(0, 2).map(person => (
                  <Link key={person} href={`/people/${encodeURIComponent(person)}`}>
                    <span className={`${styles.tag} ${styles.personTag}`}>{person}</span>
                  </Link>
                ))}
                
                {card.places && card.places.slice(0, 1).map(place => (
                  <Link key={place} href={`/places/${encodeURIComponent(place)}`}>
                    <span className={`${styles.tag} ${styles.placeTag}`}>{place}</span>
                  </Link>
                ))}
              </div>
            </div>
            
            <Link href={`/stories/${card.id}`}>
              <a className={styles.cardLink}>Read More</a>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardGrid;