export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido",
    })
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: "GROQ_API_KEY não está configurada no Vercel.",
    })
  }

  try {
    const { question, lang } = req.body

    const languageMap = {
      pt: "português europeu",
      en: "English",
      es: "español",
      fr: "français",
      it: "italiano",
      de: "Deutsch",
      ar: "العربية",
    }

    const responseLanguage = languageMap[lang] || "a mesma língua da pergunta"

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `
Tu és o Donkei, um assistente académico amigável.
Explicas informática de forma simples, curta e clara.
Responde em ${responseLanguage}.
Se a pergunta estiver noutra língua, responde nessa mesma língua.
Não mudes para português se a pergunta não estiver em português.
            `,
          },
          {
            role: "user",
            content: question || "Explain what computer science is.",
          },
        ],
        temperature: 0.4,
        max_tokens: 450,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "Erro da Groq.",
      })
    }

    return res.status(200).json({
      answer: data.choices?.[0]?.message?.content || "Não consegui gerar resposta.",
    })
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erro interno no Donkei.",
    })
  }
}