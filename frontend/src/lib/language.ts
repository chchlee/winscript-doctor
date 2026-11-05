export type Language = 'en' | 'ko'

export const languageKey = 'wsd-language'

export function savedLanguage(): Language {
  try {
    return localStorage.getItem(languageKey) === 'ko' ? 'ko' : 'en'
  } catch {
    return 'en'
  }
}
