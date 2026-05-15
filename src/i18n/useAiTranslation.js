import { useEffect, useState } from "react"

const allowedLanguages = ["pt", "en", "es", "fr", "it", "de", "ar"]

function getDeviceLanguage() {
  const browserLang = navigator.language?.split("-")[0] || "pt"
  return allowedLanguages.includes(browserLang) ? browserLang : "pt"
}

function deepMerge(original, translated) {
  if (!translated || typeof translated !== "object") return original

  const result = Array.isArray(original) ? [...original] : { ...original }

  Object.keys(original).forEach((key) => {
    if (Array.isArray(original[key])) {
      result[key] = Array.isArray(translated[key])
        ? translated[key]
        : original[key]
    } else if (
      original[key] &&
      typeof original[key] === "object"
    ) {
      result[key] = deepMerge(original[key], translated[key])
    } else {
      result[key] =
        typeof translated[key] === "string" && translated[key].trim()
          ? translated[key]
          : original[key]
    }
  })

  return result
}

export function useAiTranslation(originalTexts) {
  const [lang, setLang] = useState(getDeviceLanguage())
  const [texts, setTexts] = useState(originalTexts)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function translateTexts() {
      if (lang === "pt") {
        setTexts(originalTexts)
        document.documentElement.dir = "ltr"
        return
      }

      const cacheKey = `imparaconme-translation-${lang}`

      try {
        const cached = localStorage.getItem(cacheKey)

        if (cached) {
          const parsed = JSON.parse(cached)
          setTexts(deepMerge(originalTexts, parsed))
          document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
          return
        }
      } catch {
        localStorage.removeItem(cacheKey)
      }

      setLoading(true)

      try {
        const response = await fetch("/api/translate-site", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lang,
            texts: originalTexts,
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.translatedTexts) {
          setTexts(originalTexts)
          return
        }

        const safeTexts = deepMerge(originalTexts, data.translatedTexts)

        setTexts(safeTexts)
        localStorage.setItem(cacheKey, JSON.stringify(safeTexts))
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
      } catch (error) {
        console.error("Erro na tradução:", error)
        setTexts(originalTexts)
      }

      setLoading(false)
    }

    translateTexts()
  }, [lang])

  return {
    texts,
    lang,
    setLang,
    loading,
  }
}