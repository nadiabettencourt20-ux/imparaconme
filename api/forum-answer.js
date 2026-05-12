import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido",
    })
  }

  try {
    const { question } = req.body

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "És o Donkei, uma IA que explica informática de forma simples e curta.",
        },
        {
          role: "user",
          content: question,
        },
      ],
    })

    return res.status(200).json({
      answer: response.choices[0].message.content,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: "Erro ao contactar OpenAI",
    })
  }
}