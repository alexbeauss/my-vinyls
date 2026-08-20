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
      className="bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-full px-3 py-1 text-sm cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
    >
      <option value="system" className="bg-gray-800 text-white">Système</option>
      <option value="dark" className="bg-gray-800 text-white">Sombre</option>
      <option value="light" className="bg-gray-800 text-white">Clair</option>
    </select>
  )
}
