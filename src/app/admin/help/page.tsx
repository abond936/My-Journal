import { readFile } from 'fs/promises';
import path from 'path';
import AuthorGuide from '@/components/admin/help/AuthorGuide';

export const metadata = {
  title: "Author Guide | My Stories",
};

export default async function AdminHelpPage() {
  const guidePath = path.join(process.cwd(), 'docs', '07-Users-Guide.md');
  const markdown = await readFile(guidePath, 'utf8');

  return <AuthorGuide markdown={markdown} />;
}
