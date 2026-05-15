export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido",
    })
  }

  try {
    const { lang, texts } = req.body

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "GROQ_API_KEY não configurada.",
      })
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `
Traduz os valores deste objeto JSON para o idioma "${lang}".
Mantém exatamente as mesmas chaves.
Não traduz marcas, nomes próprios ou palavras técnicas como Donkei, Upload, API, Frontend, Backend, Supabase, GitHub.
Responde apenas com JSON válido.
            `,
          },
          {
            role: "user",
            content: JSON.stringify(texts),
          },
        ],
        temperature: 0.2,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "Erro ao traduzir.",
      })
    }

    const content = data.choices[0].message.content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()

    const translatedTexts = JSON.parse(content)

    return res.status(200).json({
      translatedTexts,
    })
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erro interno.",
    })
  }
}