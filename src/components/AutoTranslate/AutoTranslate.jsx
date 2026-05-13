import { useEffect } from "react"

const supportedLanguages = ["pt", "en", "es", "fr", "it", "de", "ar"]

function AutoTranslate() {
  useEffect(() => {
    const browserLang = navigator.language.split("-")[0]

    if (!supportedLanguages.includes(browserLang)) return
    if (browserLang === "pt") return

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "pt",
          includedLanguages: supportedLanguages.join(","),
          autoDisplay: false,
        },
        "google_translate_element"
      )

      setTimeout(() => {
        const select = document.querySelector(".goog-te-combo")

        if (select) {
          select.value = browserLang
          select.dispatchEvent(new Event("change"))
        }

        if (browserLang === "ar") {
          document.documentElement.dir = "rtl"
        } else {
          document.documentElement.dir = "ltr"
        }
      }, 1000)
    }

    const script = document.createElement("script")
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
    script.async = true

    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return <div id="google_translate_element" className="translate-hidden" />
}

export default AutoTranslate