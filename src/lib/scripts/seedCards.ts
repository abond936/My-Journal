/* eslint-disable no-console */
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { addCard, deleteAllCards } from '../services/cardService';
import { Card } from '../types/card';

const FATHER_QA_CONTENT = {
  qa1: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'His first car was a 1955 Chevrolet Bel Air, in a stunning two-tone turquoise and white. He bought it used in 1962 and loved that car more than anything. He always told stories about cruising down Main Street with the windows down, listening to the new rock and roll station.',
          },
        ],
      },
    ],
  },
  qa2: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: "They met at a college dance in the fall of 1965. Mom was there with her friends, and Dad was the awkward guy in the corner who was too shy to ask anyone to dance. Mom, never one to wait around, walked right up to him and asked him. He was so stunned he could barely speak, but he said yes. They were inseparable after that.",
          },
        ],
      },
    ],
  },
  qa3: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: "He always said his proudest moment was watching my brother and I graduate from college. He didn't have the chance to finish his own degree because he had to work to support his family, so seeing us achieve that meant the world to him. He cried at both of our ceremonies.",
          },
        ],
      },
    ],
  },
  qa4: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: "His biggest regret was not telling his own father he loved him before he passed away. They had a complicated relationship, and he always thought there would be more time to mend things. It's the reason he never ended a phone call with us without saying 'I love you.'",
          },
        ],
      },
    ],
  },
};

const createCard = async (cardData: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>) => {
  console.log(`Creating card: ${cardData.title || cardData.subtitle}`);
  const newCard = await addCard(cardData);
  console.log(`  -> Created with ID: ${newCard.id}`);
  return newCard;
};

const seed = async () => {
  try {
    console.log('--- Starting card seeding script ---');

    console.log('\n!!! DELETING ALL EXISTING CARDS IN 5 SECONDS !!!');
    await new Promise(res => setTimeout(res, 5000));
    await deleteAllCards();
    console.log('--- All cards deleted ---');

    // --- "My Father" Collection ---
    console.log('\nCreating "My Father" collection...');
    const qa1 = await createCard({ title: 'What was his first car?', type: 'qa', status: 'published', displayMode: 'inline', content: FATHER_QA_CONTENT.qa1 });
    const qa2 = await createCard({ title: 'Where did he meet mom?', type: 'qa', status: 'published', displayMode: 'inline', content: FATHER_QA_CONTENT.qa2 });
    const qa3 = await createCard({ title: 'What was his proudest moment?', type: 'qa', status: 'published', displayMode: 'inline', content: FATHER_QA_CONTENT.qa3 });
    const qa4 = await createCard({ title: 'What was his biggest regret?', type: 'qa', status: 'published', displayMode: 'inline', content: FATHER_QA_CONTENT.qa4 });
    const gallery1 = await createCard({ title: 'Childhood Photos', subtitle: 'Photos from his early years.', type: 'gallery', media: [{ url: 'https://source.unsplash.com/random/800x600?child' }, { url: 'https://source.unsplash.com/random/800x600?boy' }], status: 'published', displayMode: 'inline' });
    const gallery2 = await createCard({ title: 'Family Trips', subtitle: 'Our vacations together.', type: 'gallery', media: [{ url: 'https://source.unsplash.com/random/800x600?family' }, { url: 'https://source.unsplash.com/random/800x600?travel' }], status: 'published', displayMode: 'navigate' });
    
    const myFather = await createCard({
      title: 'My Father',
      subtitle: 'A collection of stories and memories about my dad.',
      type: 'story',
      displayMode: 'navigate',
      tags: { who: ['Dad'], what: ['Family History'] },
      coverImage: { url: 'https://source.unsplash.com/random/800x600?father' },
      childrenIds: [qa1.id, qa2.id, qa3.id, qa4.id, gallery1.id, gallery2.id],
      status: 'published',
    });
    
    // --- "The World in 1959" Collection ---
    console.log('\nCreating "The World in 1959" collection...');
    const politics = await createCard({ title: 'Politics', subtitle: 'A year of global political change.', type: 'story', coverImage: { url: 'https://source.unsplash.com/random/800x600?politics' }, media: [{ url: 'https://source.unsplash.com/random/800x600?government' }], status: 'published', displayMode: 'inline' });
    const culture = await createCard({ title: 'Culture', subtitle: 'Music, movies, and art from the era.', type: 'story', coverImage: { url: 'https://source.unsplash.com/random/800x600?culture' }, media: [{ url: 'https://source.unsplash.com/random/800x600?art' }], status: 'published', displayMode: 'inline' });
    const economy = await createCard({ title: 'Economy', subtitle: 'The post-war boom continues.', type: 'story', coverImage: { url: 'https://source.unsplash.com/random/800x600?economy' }, media: [{ url: 'https://source.unsplash.com/random/800x600?money' }], status: 'published', displayMode: 'inline' });
    const science = await createCard({ title: 'Science', subtitle: 'The space race heats up.', type: 'story', coverImage: { url: 'https://source.unsplash.com/random/800x600?science' }, media: [{ url: 'https://source.unsplash.com/random/800x600?technology' }], status: 'published', displayMode: 'inline' });

    const worldIn1959 = await createCard({
      title: 'The World in 1959',
      subtitle: 'A look back at a pivotal year.',
      type: 'story',
      displayMode: 'navigate',
      tags: { what: ['History'], when: ['1959'] },
      childrenIds: [politics.id, culture.id, economy.id, science.id],
      status: 'published',
    });

    console.log('\n--- Seeding finished successfully! ---');
    console.log('Created parent cards:');
    console.log(`- ${myFather.title}: /collections/${myFather.id}`);
    console.log(`- ${worldIn1959.title}: /collections/${worldIn1959.id}`);

  } catch (error) {
    console.error('\n--- Seeding failed ---');
    console.error(error);
    process.exit(1);
  }
};

seed(); 