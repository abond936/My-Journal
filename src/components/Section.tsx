import Navbar from './Navbar';
import Image from 'next/image';

interface SectionProps {
  title: string;
  content: string;
  imageUrl: string;
}

export default function Section({ title, content, imageUrl }: SectionProps) {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <Navbar />

      <main className="flex flex-col items-center justify-center flex-grow pt-16">
        <h1 className="text-4xl font-bold mb-4">{title}</h1>
        <p className="text-lg max-w-2xl text-center">
          {content}
        </p>

        <div className="mt-8">
          <Image src={imageUrl} alt={title} width={400} height={300} />
        </div>
      </main>
    </div>
  );
}
