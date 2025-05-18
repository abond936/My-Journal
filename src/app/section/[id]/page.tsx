
import SectionPage from '../../../components/Section';

const dummySections = {
  '1': {
    title: 'Section 1:  Beginnings',
    content: 'This section talks about the early days and how everything started. A journey through memories.',
    imageUrl: '/images/section1.jpg',
  },
  '2': {
    title: 'Section 2: Growth',
    content: 'Here, we explore growth, challenges, and the lessons learned along the way.',
    imageUrl: '/images/section2.jpg',
  },
};

interface PageProps {
  params: { id: string };
}

export default function Section({ params }: PageProps) {
  const section = dummySections[params.id] || {
    title: 'Section Not Found',
    content: 'The section you are looking for does not exist.',
    imageUrl: '/images/placeholder.jpg',
  };

  return (
    <main>
      <SectionPage {...section} />
    </main>
  );
}
