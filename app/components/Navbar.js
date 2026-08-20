"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LogoutButton from './LogoutButton';
import SearchModal from './SearchModal';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ user, onProfileClick, onSearchToggle }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [discogsCollection, setDiscogsCollection] = useState([]);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const response = await fetch('/api/discogs');
        const data = await response.json();
        if (data.releases) {
          setDiscogsCollection(data.releases);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de la collection:', error);
      }
    };

    fetchCollection();
  }, []);

  return (
    <nav className="bg-gradient-to-r from-blue-500 to-blue-900 dark:from-blue-600 dark:to-blue-800 px-4 py-3">
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="font-mono text-white text-xl sm:text-2xl font-bold min-w-0 hover:opacity-80 transition-opacity duration-200">
          my vinyls
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          {/* ThemeToggle — version icône compacte dans la navbar */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <button 
            onClick={() => {
              setIsSearchOpen(true);
              onSearchToggle?.(true);
            }}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors duration-200"
            aria-label="Rechercher"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={onProfileClick}
            className="p-1 rounded-full hover:ring-2 hover:ring-white/60 transition-all duration-200"
            aria-label="Profil"
          >
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

      {discogsCollection && (
        <SearchModal 
          isOpen={isSearchOpen} 
          onClose={() => {
            setIsSearchOpen(false);
            onSearchToggle?.(false);
          }} 
          discogsCollection={discogsCollection}
        />
      )}
    </nav>
  );
}
