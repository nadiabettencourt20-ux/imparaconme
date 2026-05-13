export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido",
    })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY não está configurada no Vercel.",
    })
  }

  try {
    const { question } = req.body

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "És o Donkei, um assistente académico que explica informática de forma simples, curta e em português europeu.",
          },
          {
            role: "user",
            content: question || "Explica o que é informática.",
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "Erro desconhecido da OpenAI.",
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