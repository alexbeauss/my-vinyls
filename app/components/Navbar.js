"use client";
import Link from 'next/link';
import Image from 'next/image';
import LogoutButton from './LogoutButton';

export default function Navbar({ user, onProfileClick }) {
  return (
    <nav className="bg-blue-900 dark:bg-blue-800 p-4">
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="font-mono text-white text-2xl font-bold">
          my vinyls
        </Link>
        <div className="flex items-center">
          <button onClick={onProfileClick} className="ml-6 mr-6">
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
  );
}
