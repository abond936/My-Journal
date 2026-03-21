'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import JournalImage from '@/components/common/JournalImage';
import { Tag } from '@/lib/types/tag';
import styles from './ContentCard.module.css';

// Import Swiper components and styles
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import type { Media } from '@/lib/types/photo';
import { getDisplayUrl } from '@/lib/utils/photoUtils';

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
  cardType?: 'story' | 'qa' | 'quote' | 'callout' | 'gallery' | 'collection';
  galleryMedia?: Media[];
}

interface AlbumCardProps extends BaseCardProps {
  type: 'album';
  images?: Media[];
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
            <h2 className={styles.title}>{title}</h2>
            {description && <p className={styles.description}>{description}</p>}
            {entryProps.date && <div className={styles.date}>{entryProps.date}</div>}
            {entryProps.tags && entryProps.tags.length > 0 && (
              <div className={styles.tags}>
                {entryProps.tags.map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            )}
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

  const isGalleryEntry = (props: ContentCardProps): props is EntryCardProps => {
    return props.type === 'entry' && (props as EntryCardProps).cardType === 'gallery';
  };

  return (
    <Link href={href} className={`${styles.card} ${styles[type]} ${styles[size]}`}>
      {isGalleryEntry(props) && props.galleryMedia && props.galleryMedia.length > 0 ? (
        <Swiper
          modules={[Pagination, Navigation]}
          spaceBetween={0}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          className={styles.swiperContainer}
        >
          {props.galleryMedia.map((image) => (
            <SwiperSlide key={image.docId}>
              <div className={styles.imageContainer}>
                <JournalImage 
                  src={getDisplayUrl(image)} 
                  alt={image.filename || title} 
                  className={styles.image}
                  width={400}
                  height={300}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={false}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      ) : isAlbum(props) && props.images && props.images.length > 0 ? (
        <Swiper
          modules={[Pagination, Navigation]}
          spaceBetween={0}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          className={styles.swiperContainer}
        >
          {props.images.map((image) => {
            const imageUrl = getDisplayUrl(image);
            return (
              <SwiperSlide key={image.docId}>
                <div className={styles.imageContainer}>
                  <JournalImage 
                    src={imageUrl} 
                    alt={image.filename || title} 
                    className={styles.image}
                    width={400}
                    height={300}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={false}
                  />
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      ) : imageUrl ? (
        <div className={styles.imageContainer}>
          <JournalImage 
            src={
              (props as AlbumCardProps).type === 'album' && (props as any).coverPhoto?.source === 'local'
                ? `/api/images/local/file?path=${encodeURIComponent(imageUrl)}`
                : imageUrl
            }
            alt={title}
            className={styles.image}
            width={400}
            height={300}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
          />
        </div>
      ) : null}
      {renderContent()}
    </Link>
  );
};

export default ContentCard; 