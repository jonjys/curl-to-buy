'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { COPY } from '../lib/copy'

const STORAGE = 'nytto-locale-v2'
const LocaleContext = createContext(null)

function browserLocale() {
  try {
    const language = String(navigator.language || navigator.languages?.[0] || '').toLowerCase()
    return language.startsWith('sv') ? 'sv' : 'en'
  } catch {
    return 'en'
  }
}

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState('en')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE)
      if (stored === 'sv' || stored === 'en') setLocale(stored)
      else setLocale(browserLocale())
    } catch {
      setLocale(browserLocale())
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  function setLang(next) {
    setLocale(next)
    try {
      localStorage.setItem(STORAGE, next)
    } catch {}
  }

  return (
    <LocaleContext.Provider value={{ locale, setLang, t: COPY[locale] }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale')
  return ctx
}
