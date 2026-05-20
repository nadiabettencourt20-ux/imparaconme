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
Cria um jornal de estudo visual, longo e dividido em várias páginas.
Não faças resumo curto.
Se o documento for grande, cria várias páginas.
Cada página deve parecer uma página de revista/infográfico.
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
${fileText?.slice(0, 30000)}

Formato obrigatório:
{
  "title": "título forte",
  "subtitle": "subtítulo editorial",
  "category": "Matemática",
  "visual_style": "magazine-red",
  "lead": "introdução forte",
  "summary": "resumo desenvolvido em 6 a 10 frases",
  "quote": "frase forte",
  "keywords": ["conceito 1", "conceito 2", "conceito 3"],
  "study_plan": ["passo 1", "passo 2", "passo 3", "passo 4"],
  "pages": [
    {
      "layout": "cover",
      "title": "capa",
      "body": "texto desenvolvido",
      "blocks": ["bloco 1", "bloco 2", "bloco 3"]
    },
    {
      "layout": "article",
      "title": "secção importante",
      "body": "texto longo e explicado",
      "blocks": ["conceito", "exemplo", "observação"]
    },
    {
      "layout": "infographic",
      "title": "conceitos principais",
      "body": "explicação",
      "blocks": ["ponto 1", "ponto 2", "ponto 3", "ponto 4"]
    }
  ],
  "type": "Jornal de estudo"
}

Cria entre 4 e 8 páginas, dependendo do conteúdo.
Categorias possíveis:
"Matemática", "Programação", "Redes", "Bases de Dados", "Algoritmos"

visual_style:
"magazine-red", "black-white-news", "infographic-cards", "timeline-ui", "academic-book"
            `,
          },
        ],
        temperature: 0.35,
        max_tokens: 3500,
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