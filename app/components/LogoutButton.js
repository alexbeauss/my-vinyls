"use client";
import { useUser } from '@auth0/nextjs-auth0/client';

export default function LogoutButton() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <a href="/api/auth/logout" className="text-white hover:text-blue-200 flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
        <line x1="12" y1="2" x2="12" y2="12"></line>
      </svg>
    </a>
  );
}
