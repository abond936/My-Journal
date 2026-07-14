import type { Tag } from '@/lib/types/tag';

export type TagSet0SeedNode = {
  name: string;
  dimension?: Tag['dimension'];
  defaultExpanded?: boolean;
  children?: TagSet0SeedNode[];
};

const US_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
] as const;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const RECENT_YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'] as const;

/** Optional starter taxonomy — additive install only; never replaces existing tags. */
export const TAG_SET_0_GENERIC_SEED: TagSet0SeedNode[] = [
  { name: 'Grandparents', dimension: 'who' },
  { name: 'Parents', dimension: 'who' },
  { name: 'Siblings', dimension: 'who' },
  { name: 'Children', dimension: 'who' },
  { name: 'Extended Family', dimension: 'who' },
  { name: 'Friends', dimension: 'who' },
  {
    name: 'General',
    dimension: 'what',
    defaultExpanded: true,
    children: [
      {
        name: 'Activities',
        children: [
          { name: 'Sports & Outdoors' },
          { name: 'Holidays' },
          { name: 'Everyday Life' },
        ],
      },
      {
        name: 'Education',
        children: [{ name: 'School' }, { name: 'Graduation' }],
      },
      { name: 'Reflections' },
      { name: 'Travel' },
      { name: 'Milestones' },
    ],
  },
  ...RECENT_YEARS.map((year) => ({ name: year, dimension: 'when' as const })),
  {
    name: 'Months',
    dimension: 'when',
    children: MONTHS.map((month) => ({ name: month })),
  },
  {
    name: 'United States',
    dimension: 'where',
    defaultExpanded: false,
    children: US_STATES.map((state) => ({ name: state })),
  },
];
