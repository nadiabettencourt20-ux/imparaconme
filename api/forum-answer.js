import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }

  try {
    const { question } = req.body

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "És o Donkei, um assistente académico amigável. Responde em português europeu, de forma clara, útil e curta.",
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
  } catch {
    return res.status(500).json({
      error: "Erro ao gerar resposta.",
    })
  }
}