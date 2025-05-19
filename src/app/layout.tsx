import '../styles/global.css';
import Pagination from '../components/Pagination';

export const metadata = {
  title: 'My Journal',
  description: 'Personal journal built with Next.js',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Pagination />
      </body>
    </html>
  );
}