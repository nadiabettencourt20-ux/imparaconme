export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido",
    })
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: "GROQ_API_KEY não está configurada.",
    })
  }

  try {
    const { title, fileName, fileType, fileText, language } = req.body

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
            content:
              "Cria um resumo académico em JSON válido. Responde apenas com JSON, sem markdown.",
          },
          {
            role: "user",
            content: `
Idioma: ${language || "Português"}
Título: ${title || fileName}
Tipo de ficheiro: ${fileType || "documento"}
Nome do ficheiro: ${fileName}

Conteúdo extraído:
${fileText || "O ficheiro foi enviado, mas não foi possível extrair texto. Cria uma estrutura genérica para estudo."}

Responde neste formato JSON:
{
  "title": "título curto",
  "category": "Programação",
  "summary": "resumo simples do material",
  "highlights": ["ponto 1", "ponto 2", "ponto 3"],
  "type": "Jornal de estudo"
}

A category tem de ser uma destas:
"Matemática", "Programação", "Redes", "Bases de Dados", "Algoritmos"
            `,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "Erro da Groq.",
      })
    }

    return res.status(200).json({
      content: data.choices?.[0]?.message?.content || "{}",
    })
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erro interno ao gerar jornal.",
    })
  }
}