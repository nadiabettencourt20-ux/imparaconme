import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }

  try {
    const { title, fileName, fileType, fileText, language } = req.body

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
Tu és um sistema de organização de materiais universitários.
Transforma documentos em jornais visuais modernos.
Responde APENAS em JSON válido.

Categorias:
- Matemática
- Programação
- Redes
- Bases de Dados
- Algoritmos

Formato:
{
"title":"...",
"category":"...",
"summary":"...",
"highlights":["...","...","..."],
"type":"Jornal de estudo"
}

A língua da resposta deve ser ${language}.
          `,
        },
        {
          role: "user",
          content: `
Título: ${title}
Nome do ficheiro: ${fileName}
Tipo: ${fileType || "desconhecido"}

Conteúdo:
${fileText || "Não disponível"}
          `,
        },
      ],
    })

    return res.status(200).json({
      content: response.choices[0].message.content,
    })
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao gerar jornal.",
    })
  }
}