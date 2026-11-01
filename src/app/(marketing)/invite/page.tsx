import type { Metadata } from 'next';
import InviteAcceptClient from './InviteAcceptClient';

export const metadata: Metadata = {
  title: 'Invitation — My Stories',
  description: 'Open a private My Stories invitation.',
};

export default function InvitePage() {
  return <InviteAcceptClient />;
}
