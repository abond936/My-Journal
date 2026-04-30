import { redirect } from 'next/navigation';

export default function NewCardPage() {
  redirect('/admin/studio?new=1');
}
