export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY não configurada." })
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
            content: `
Cria um jornal/infográfico visual de estudo baseado no conteúdo real.
Não faças resumo genérico.
Cria conteúdo rico, dividido e organizado como revista, jornal ou infográfico.
Responde APENAS com JSON válido.
            `,
          },
          {
            role: "user",
            content: `
Idioma: ${language || "Português"}
Título: ${title}
Ficheiro: ${fileName}
Tipo: ${fileType}

Conteúdo:
${fileText?.slice(0, 26000)}

Formato obrigatório:
{
  "title": "título forte",
  "subtitle": "subtítulo editorial",
  "category": "Matemática",
  "visual_style": "magazine-red",
  "lead": "abertura estilo jornal",
  "summary": "resumo desenvolvido",
  "sections": [
    { "title": "secção 1", "body": "texto completo" },
    { "title": "secção 2", "body": "texto completo" },
    { "title": "secção 3", "body": "texto completo" },
    { "title": "secção 4", "body": "texto completo" }
  ],
  "highlights": ["ponto 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"],
  "keywords": ["conceito 1", "conceito 2", "conceito 3", "conceito 4"],
  "study_plan": ["passo 1", "passo 2", "passo 3", "passo 4"],
  "quote": "frase forte do tema",
  "type": "Jornal de estudo"
}

Categorias possíveis:
"Matemática", "Programação", "Redes", "Bases de Dados", "Algoritmos"

visual_style deve ser um destes:
"magazine-red", "black-white-news", "infographic-cards", "timeline-ui", "academic-book"
            `,
          },
        ],
        temperature: 0.35,
        max_tokens: 1800,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "Erro da IA.",
      })
    }

    return res.status(200).json({
      content: data.choices?.[0]?.message?.content || "{}",
    })
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erro interno.",
    })
  }
}