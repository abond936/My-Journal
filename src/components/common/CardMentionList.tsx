'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import styles from './CardMentionList.module.css';

export type CardMentionItem = { id: string; label: string };

export type CardMentionListProps = {
  items: CardMentionItem[];
  command: (item: CardMentionItem) => void;
};

export type CardMentionListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

const CardMentionList = forwardRef<CardMentionListHandle, CardMentionListProps>(
  function CardMentionList({ items, command }, ref) {
    const [selected, setSelected] = useState(0);

    useEffect(() => {
      setSelected(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) {
          return false;
        }
        if (event.key === 'ArrowUp') {
          setSelected(s => (s + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelected(s => (s + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          const it = items[selected];
          if (it) command(it);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className={styles.root}>
          <div className={styles.empty}>No matching cards</div>
        </div>
      );
    }

    return (
      <div className={styles.root}>
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={i === selected ? styles.itemSelected : styles.item}
            onMouseDown={e => e.preventDefault()}
            onMouseEnter={() => setSelected(i)}
            onClick={() => command(item)}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }
);

CardMentionList.displayName = 'CardMentionList';
export default CardMentionList;
