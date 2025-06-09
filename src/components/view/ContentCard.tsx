'use client';

import React from 'react';
import Link from 'next/link';
import { Tag } from '@/lib/types/tag';
import styles from './ContentCard.module.css';

// Import Swiper components and styles
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { PhotoMetadata } from '@/lib/types/photo';

interface BaseCardProps {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  size?: 'large' | 'medium' | 'small';
  href: string;
}

interface TagCardProps extends BaseCardProps {
  type: 'tag';
  dimension?: 'who' | 'what' | 'when' | 'where' | 'reflection';
  entryCount?: number;
  albumCount?: number;
  parentId?: string;
  onBack?: () => void;
}

interface EntryCardProps extends BaseCardProps {
  type: 'entry';
  date?: string;
  tags?: string[];
}

interface AlbumCardProps extends BaseCardProps {
  type: 'album';
  images?: PhotoMetadata[];
  entryCount?: number;
  date?: string;
  tags?: string[];
}

type ContentCardProps = TagCardProps | EntryCardProps | AlbumCardProps;

const ContentCard: React.FC<ContentCardProps> = (props) => {
  const {
    id,
    title,
    description,
    imageUrl,
    size = 'medium',
    href,
    type
  } = props;

  const renderContent = () => {
    switch (type) {
      case 'tag':
        const tagProps = props as TagCardProps;
        return (
          <div className={styles.content}>
            <div className={styles.header}>
              {tagProps.parentId && (
                <button 
                  onClick={tagProps.onBack}
                  className={styles.backButton}
                  aria-label="Go back"
                >
                  ← Back
                </button>
              )}
              <div className={styles.dimension}>{tagProps.dimension}</div>
            </div>
            <h2 className={styles.title}>{title}</h2>
            {(tagProps.entryCount || tagProps.albumCount) && (
              <div className={styles.counts}>
                {tagProps.entryCount > 0 && (
                  <span className={styles.count}>
                    {tagProps.entryCount} {tagProps.entryCount === 1 ? 'entry' : 'entries'}
                  </span>
                )}
                {tagProps.albumCount > 0 && (
                  <span className={styles.count}>
                    {tagProps.albumCount} {tagProps.albumCount === 1 ? 'album' : 'albums'}
                  </span>
                )}
              </div>
            )}
            {description && <p className={styles.description}>{description}</p>}
          </div>
        );

      case 'entry':
        const entryProps = props as EntryCardProps;
        return (
          <div className={styles.content}>
            <div className={styles.header}>
              {entryProps.tags && entryProps.tags.length > 0 && (
                <div className={styles.tags}>
                  {entryProps.tags.slice(0, 3).map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}
              {entryProps.date && <time className={styles.date}>{entryProps.date}</time>}
            </div>
            <h2 className={styles.title}>{title}</h2>
            {description && <p className={styles.description}>{description}</p>}
          </div>
        );

      case 'album':
        const albumProps = props as AlbumCardProps;
        return (
          <div className={styles.content}>
            <div className={styles.header}>
              {albumProps.tags && albumProps.tags.length > 0 && (
                <div className={styles.tags}>
                  {albumProps.tags.slice(0, 3).map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}
              {albumProps.date && <time className={styles.date}>{albumProps.date}</time>}
            </div>
            <h2 className={styles.title}>{title}</h2>
            {albumProps.entryCount && (
              <div className={styles.counts}>
                <span className={styles.count}>
                  {albumProps.entryCount} {albumProps.entryCount === 1 ? 'entry' : 'entries'}
                </span>
              </div>
            )}
            {description && <p className={styles.description}>{description}</p>}
          </div>
        );
    }
  };

  const isAlbum = (props: ContentCardProps): props is AlbumCardProps => props.type === 'album';

  return (
    <Link href={href} className={`${styles.card} ${styles[type]} ${styles[size]}`}>
      {isAlbum(props) && props.images && props.images.length > 0 ? (
        <Swiper
          modules={[Pagination, Navigation]}
          spaceBetween={0}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          className={styles.swiperContainer}
        >
          {props.images.map((image) => (
            <SwiperSlide key={image.path}>
              <div className={styles.imageContainer}>
                <img src={image.path} alt={image.filename || title} className={styles.image} />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      ) : imageUrl ? (
        <div className={styles.imageContainer}>
          <img src={imageUrl} alt={title} className={styles.image} />
        </div>
      ) : null}
      {renderContent()}
    </Link>
  );
};

export default ContentCard; 