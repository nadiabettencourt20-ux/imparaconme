export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: "GROQ_API_KEY não está configurada.",
    })
  }

  try {
    const { title, fileName, fileType, fileText, language } = req.body

    if (!fileText || fileText.trim().length < 50) {
      return res.status(400).json({
        error: "Não foi possível ler texto suficiente do documento.",
      })
    }

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
Cria um jornal de estudo real baseado no conteúdo do documento.
Não inventes conteúdo genérico.
Usa o idioma: ${language || "English"}.
Responde APENAS com JSON válido.
            `,
          },
          {
            role: "user",
            content: `
Título dado: ${title}
Nome do ficheiro: ${fileName}
Tipo: ${fileType}

Conteúdo do documento:
${fileText.slice(0, 18000)}

Responde neste formato:
{
  "title": "título curto e real do conteúdo",
  "category": "Mathematics",
  "summary": "resumo claro do documento em 2 frases",
  "highlights": [
    "conceito principal 1",
    "conceito principal 2",
    "conceito principal 3"
  ],
  "type": "Jornal de estudo"
}

A category tem de ser uma destas:
"Matemática", "Programação", "Redes", "Bases de Dados", "Algoritmos"
            `,
          },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "Erro da IA ao gerar jornal.",
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