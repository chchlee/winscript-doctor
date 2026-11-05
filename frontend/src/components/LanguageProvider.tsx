import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { languageKey, savedLanguage, type Language } from '@/lib/language'
import { english } from '@/lib/messages'

type Values = Record<string, string | number>
const englishMessages = new Map(Object.entries(english))
const koreanMessages = new Map(Object.entries(english).map(([ko, en]) => [en, ko]))

export function translate(message: string, language: Language, values: Values = {}): string {
  const text =
    language === 'ko'
      ? (koreanMessages.get(message) ?? message)
      : (englishMessages.get(message) ?? message)
  return text.replace(/\{(\w+)\}/gu, (token, key: string) => String(values[key] ?? token))
}

const LanguageContext = createContext<{
  language: Language
  changeLanguage: (language: Language) => boolean
  t: (message: string, values?: Values) => string
} | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(savedLanguage)
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  const value = useMemo(
    () => ({
      language,
      changeLanguage(next: Language) {
        try {
          localStorage.setItem(languageKey, next)
        } catch {
          return false
        }
        setLanguage(next)
        return true
      },
      t: (message: string, values?: Values) => translate(message, language, values),
    }),
    [language],
  )
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('LanguageProvider is required')
  return context
}
