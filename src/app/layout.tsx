import '../styles/global.css';

export const metadata = {
  title: 'My Journal',
  description: 'Personal journal built with Next.js',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}