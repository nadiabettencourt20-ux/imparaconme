import { useEffect, useState } from "react"

const defaultLang = "pt"

function getDeviceLanguage() {
  const lang = navigator.language?.split("-")[0] || defaultLang

  const allowed = ["pt", "en", "es", "fr", "it", "de", "ar"]

  return allowed.includes(lang) ? lang : defaultLang
}

export function useAiTranslation(originalTexts) {
  const [lang, setLang] = useState(getDeviceLanguage())
  const [texts, setTexts] = useState(originalTexts)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function translateTexts() {
      if (lang === "pt") {
        setTexts(originalTexts)
        return
      }

      const cacheKey = `translation-${lang}`

      const cached = localStorage.getItem(cacheKey)

      if (cached) {
        setTexts(JSON.parse(cached))
        return
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

        if (data.translatedTexts) {
          setTexts(data.translatedTexts)
          localStorage.setItem(cacheKey, JSON.stringify(data.translatedTexts))
        }
      } catch (error) {
        console.error("Erro ao traduzir:", error)
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