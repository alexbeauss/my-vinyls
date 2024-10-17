"use client";
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Utilisé pour éviter les erreurs d'hydratation
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <select 
      value={theme} 
      onChange={e => setTheme(e.target.value)}
      className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
    >
      <option value="system">Système</option>
      <option value="dark">Sombre</option>
      <option value="light">Clair</option>
    </select>
  )
}
