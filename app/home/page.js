import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';

const ClientHome = dynamic(() => import('./ClientHome'), { ssr: false });

export default async function HomePage() {
  const session = await getSession();

  if (!session || !session.user) {
    redirect('/api/auth/login');
  }

  return <ClientHome />;
}
