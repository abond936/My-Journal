import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="w-full flex justify-center bg-gray-100 py-4 shadow">
      <ul className="flex space-x-6 text-lg font-medium">
        <li>
          <Link href="/">Title Page</Link>
        </li>
        <li>
          <Link href="/introduction">Introduction</Link>
        </li>
        <li>
          <Link href="/section/1">Section 1</Link>
        </li>
        <li>
          <Link href="/section/2">Section 2</Link>
        </li>
      </ul>
    </nav>
  );
}
