export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "GROQ_API_KEY não configurada.",
      })
    }

    const { lang, texts } = req.body

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
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
Traduz apenas os VALORES deste JSON para o idioma "${lang}".
Mantém exatamente as mesmas chaves.
Não traduz: Donkei, Upload, API, Frontend, Backend, Supabase, GitHub, Impara con me.
Responde apenas com JSON válido.
              `,
            },
            {
              role: "user",
              content: JSON.stringify(texts),
            },
          ],
          temperature: 0.1,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "Erro da Groq.",
      })
    }

    const content = data.choices[0].message.content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()

    return res.status(200).json({
      translatedTexts: JSON.parse(content),
    })
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erro interno.",
    })
  }
}