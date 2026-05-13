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
    const { question } = req.body

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
            content:
              "Tu és o Donkei, uma IA simpática que explica informática da forma mais simples possível, em português europeu, para iniciantes.",
          },
          {
            role: "user",
            content: question || "Explica esta dúvida de informática de forma simples.",
          },
        ],
        temperature: 0.4,
        max_tokens: 350,
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