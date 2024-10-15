"use client";
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ClientHome from './ClientHome';
import LogoutButton from '../components/LogoutButton';
import DynamicProfilePage from '../components/DynamicProfilePage';

export default function DynamicHomePage() {
  const { user, error, isLoading } = useUser();
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/api/auth/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error.message}</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-900 p-4">
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="font-mono text-white text-2xl font-bold">
            my vinyls
          </Link>
          <div className="flex items-center">
            <Link href="/search" className="text-white mr-6 hover:text-blue-200">
              Rechercher
            </Link>
            <button onClick={() => setShowProfile(true)} className="mr-6">
              <Image
                src={user.picture || '/default-avatar.png'}
                alt="Profile"
                width={32}
                height={32}
                className="rounded-full"
              />
            </button>
            <LogoutButton />
          </div>
        </div>
      </nav>
      
      <main className="w-full max-w-7xl mx-auto px-4 py-8">
        {showProfile ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg max-w-2xl w-full max-h-screen overflow-auto">
              <button onClick={() => setShowProfile(false)} className="float-right text-2xl">&times;</button>
              <DynamicProfilePage />
            </div>
          </div>
        ) : (
          <ClientHome user={user} />
        )}
      </main>
    </div>
  );
}
