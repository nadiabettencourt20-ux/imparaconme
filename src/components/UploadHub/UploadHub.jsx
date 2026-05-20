import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import FlowingMenu from "../FlowingMenu/FlowingMenu"
import ScrollStack, { ScrollStackItem } from "../ScrollStack/ScrollStack"
import GlareHover from "../GlareHover/GlareHover"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"
import "./UploadHub.css"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

const STORAGE_BUCKET = "materials"

const defaultTexts = {
  badge: "Upload inteligente",
  title: "Transforma documentos em jornais de estudo.",
  description:
    "Envia sebentas, PDFs, resumos ou códigos. O sistema cria jornais visuais completos, organizados por tema, conceitos principais e pontos importantes.",
  languageTitle: "Escolhe a língua",
  layoutTitle: "Escolhe o layout",
  documentTitle: "Envia o documento",
  titlePlaceholder: "Título do material",
  uploadButton: "Clica para fazer upload",
  uploading: "A criar jornal completo...",
  fileTypes: "PDF, Word, imagem, texto, slides ou código",
  lastFile: "Último ficheiro:",
  categoriesTitle: "Categorias",
  categoriesDescription:
    "Os materiais são organizados por categorias para facilitar a navegação.",
  newspapersTitle: "Jornais de estudo",
  newspapersDescription:
    "Cada upload gera um jornal visual com resumo, capítulos, conceitos e pontos-chave.",
  emptyTitle: "Ainda não há jornais publicados.",
  emptyText:
    "Faz upload de um documento para criar o primeiro jornal de estudo.",
  openOriginal: "Abrir original",
}

const languages = [
  "Português",
  "English",
  "Español",
  "Français",
  "Italiano",
  "Deutsch",
  "العربية",
]

const templates = [
  {
    id: "poster",
    name: "Poster editorial",
    description: "Capa forte, imagem grande e blocos visuais.",
  },
  {
    id: "magazine",
    name: "Revista limpa",
    description: "Layout moderno com secções organizadas.",
  },
  {
    id: "columns",
    name: "Colunas jornal",
    description: "Estilo jornal académico com várias colunas.",
  },
  {
    id: "image-focus",
    name: "Imagem principal",
    description: "Imagem grande com conteúdo editorial.",
  },
  {
    id: "cards",
    name: "Cards informativos",
    description: "Blocos rápidos para estudar melhor.",
  },
  {
    id: "minimal",
    name: "Minimal académico",
    description: "Design limpo e elegante para leitura rápida.",
  },
]

const categoryImages = {
  Matemática:
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop",
  Programação:
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop",
  Redes:
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format&fit=crop",
  "Bases de Dados":
    "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=1200&auto=format&fit=crop",
  Algoritmos:
    "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop",
}

function createSafeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function readPdfText(file) {
  const arrayBuffer = await file.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise

  let finalText = ""
  const maxPages = Math.min(pdf.numPages, 60)

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()

    const pageText = content.items
      .map((item) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()

    if (pageText) {
      finalText += `\n\nPágina ${pageNumber}:\n${pageText}`
    }
  }

  return finalText.trim().slice(0, 30000)
}

async function readFileText(file) {
  const fileName = file.name.toLowerCase()

  if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
    return await readPdfText(file)
  }

  if (
    file.type.startsWith("text/") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".js") ||
    fileName.endsWith(".jsx") ||
    fileName.endsWith(".css") ||
    fileName.endsWith(".html") ||
    fileName.endsWith(".json")
  ) {
    const text = await file.text()
    return text.slice(0, 30000)
  }

  return `
Documento enviado: ${file.name}
Tipo: ${file.type || "ficheiro"}
Cria um jornal de estudo com base no nome do ficheiro e no título dado.
  `
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch {
    return null
  }
}

function normalizeArray(value, fallback = []) {
  return Array.isArray(value) && value.length > 0 ? value : fallback
}

export default function UploadHub({ texts = defaultTexts }) {
  const t = { ...defaultTexts, ...texts }

  const [selectedLanguage, setSelectedLanguage] = useState("Português")
  const [selectedTemplate, setSelectedTemplate] = useState("poster")
  const [selectedCategory, setSelectedCategory] = useState("Programação")
  const [fileName, setFileName] = useState("")
  const [materialTitle, setMaterialTitle] = useState("")
  const [materials, setMaterials] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")

  const categoryItems = useMemo(
    () =>
      Object.keys(categoryImages).map((category) => ({
        text: category,
        link: "#newspapers",
        image: categoryImages[category],
      })),
    []
  )

  const filteredMaterials = materials.filter(
    (material) => material.category === selectedCategory
  )

  useEffect(() => {
    loadMaterials()
  }, [])

  async function loadMaterials() {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) {
      setMaterials(data || [])
    }
  }

  function scrollToNewspapers() {
    document
      .getElementById("newspapers")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  async function generateNewspaperData({ title, file, fileText }) {
    if (!fileText || fileText.trim().length < 40) {
      throw new Error("Não consegui ler texto suficiente do documento.")
    }

    const response = await fetch("/api/generate-newspaper", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        fileName: file.name,
        fileType: file.type,
        language: selectedLanguage,
        fileText,
        instruction: `
Cria um JORNAL DE ESTUDO COMPLETO, não um resumo pequeno.
O jornal deve parecer uma página editorial/revista académica.

Responde apenas em JSON válido com este formato:

{
  "title": "título real do documento",
  "subtitle": "subtítulo editorial",
  "category": "Matemática",
  "summary": "resumo desenvolvido em 4 a 6 frases",
  "lead": "parágrafo inicial estilo jornalístico",
  "chapters": [
    {
      "title": "nome do capítulo/secção",
      "text": "explicação completa da secção"
    }
  ],
  "keyConcepts": [
    "conceito explicado 1",
    "conceito explicado 2",
    "conceito explicado 3",
    "conceito explicado 4",
    "conceito explicado 5"
  ],
  "studyGuide": [
    "o que estudar primeiro",
    "o que memorizar",
    "o que praticar",
    "erro comum a evitar"
  ],
  "highlights": [
    "ponto importante 1",
    "ponto importante 2",
    "ponto importante 3"
  ],
  "quote": "frase curta importante retirada ou inspirada no documento",
  "type": "Jornal de estudo"
}

A category tem de ser uma destas:
"Matemática", "Programação", "Redes", "Bases de Dados", "Algoritmos".

Se o documento for de lógica proposicional, usa category "Matemática".
Não faças conteúdo genérico.
Usa o conteúdo real do documento.
        `,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Erro ao gerar jornal.")
    }

    const aiData = safeJsonParse(data.content)

    if (!aiData) {
      throw new Error("A IA respondeu num formato inválido.")
    }

    return aiData
  }

  async function uploadOriginalFile(file) {
    const extension = file.name.split(".").pop() || "file"
    const filePath = `${createSafeId()}.${extension}`

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file)

    if (error) {
      throw error
    }

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0]

    if (!file) return

    setError("")
    setIsGenerating(true)
    setFileName(file.name)

    const title = materialTitle.trim() || file.name.replace(/\.[^/.]+$/, "")

    try {
      const fileText = await readFileText(file)
      const originalUrl = await uploadOriginalFile(file)

      const aiData = await generateNewspaperData({
        title,
        file,
        fileText,
      })

      const category = categoryImages[aiData.category]
        ? aiData.category
        : "Matemática"

      const newMaterial = {
        title: aiData.title || title,
        subtitle: aiData.subtitle || "Jornal de estudo académico",
        category,
        language: selectedLanguage,
        template: selectedTemplate,
        summary: aiData.summary || "Material organizado para estudo.",
        lead: aiData.lead || aiData.summary || "Documento transformado em jornal de estudo.",
        chapters: normalizeArray(aiData.chapters, [
          {
            title: "Conteúdo principal",
            text: aiData.summary || "Material organizado automaticamente.",
          },
        ]),
        key_concepts: normalizeArray(aiData.keyConcepts, aiData.highlights),
        study_guide: normalizeArray(aiData.studyGuide, [
          "Ler os conceitos principais",
          "Rever as definições",
          "Praticar exercícios",
          "Comparar exemplos",
        ]),
        highlights: normalizeArray(aiData.highlights, [
          "Documento carregado com sucesso",
          "Jornal criado com base no conteúdo",
          "Original guardado para consulta",
        ]),
        quote: aiData.quote || "Estudar é transformar informação em compreensão.",
        type: aiData.type || "Jornal de estudo",
        original_name: file.name,
        original_url: originalUrl,
        preview_image: categoryImages[category],
      }

      const { data, error } = await supabase
        .from("materials")
        .insert([newMaterial])
        .select()
        .single()

      if (error) {
        throw error
      }

      setMaterials([data, ...materials])
      setSelectedCategory(category)
      setMaterialTitle("")
      setTimeout(scrollToNewspapers, 250)
    } catch (err) {
      console.error(err)
      setError(err.message || "Não foi possível publicar o material agora.")
    }

    setIsGenerating(false)
  }

  function renderOpenButton(material) {
    if (!material.original_url) return null

    return (
      <a
        href={material.original_url}
        target="_blank"
        rel="noopener noreferrer"
        className="open-original-btn"
      >
        {t.openOriginal}
      </a>
    )
  }

  function getChapters(material) {
    return normalizeArray(material.chapters, [
      {
        title: "Resumo principal",
        text: material.summary,
      },
    ])
  }

  function getKeyConcepts(material) {
    return normalizeArray(material.key_concepts, material.highlights)
  }

  function getStudyGuide(material) {
    return normalizeArray(material.study_guide, [
      "Ler o resumo geral",
      "Rever os conceitos-chave",
      "Estudar os exemplos",
      "Abrir o ficheiro original",
    ])
  }

  function renderMagazineTemplate(material, index) {
    const chapters = getChapters(material)
    const keyConcepts = getKeyConcepts(material)
    const studyGuide = getStudyGuide(material)

    return (
      <article className={`newspaper-card newspaper-editorial newspaper-card-${index % 3}`}>
        <div className="newspaper-cover">
          <img
            src={material.preview_image || categoryImages[material.category]}
            alt={material.category}
          />

          <div className="newspaper-cover-overlay">
            <span>{material.category}</span>
            <h4>{material.title}</h4>
            <p>{material.subtitle || material.type}</p>
          </div>
        </div>

        <div className="newspaper-edition">
          <div className="newspaper-meta">
            <span>{material.category}</span>
            <span>{material.language}</span>
            <span>{material.type}</span>
          </div>

          <h4>{material.title}</h4>

          {material.subtitle && <h5>{material.subtitle}</h5>}

          <p className="newspaper-lead">
            {material.lead || material.summary}
          </p>

          <div className="newspaper-quote">
            “{material.quote || "Organizar conhecimento é tornar o estudo mais claro."}”
          </div>

          <div className="newspaper-columns">
            {chapters.slice(0, 4).map((chapter, chapterIndex) => (
              <section key={chapterIndex}>
                <span>0{chapterIndex + 1}</span>
                <h5>{chapter.title}</h5>
                <p>{chapter.text}</p>
              </section>
            ))}
          </div>

          <div className="newspaper-concepts">
            <h5>Conceitos principais</h5>

            <div>
              {keyConcepts.slice(0, 6).map((concept, conceptIndex) => (
                <span key={conceptIndex}>{concept}</span>
              ))}
            </div>
          </div>

          <div className="newspaper-study-guide">
            <h5>Guia de estudo</h5>

            <ol>
              {studyGuide.slice(0, 5).map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ol>
          </div>

          {renderOpenButton(material)}
        </div>
      </article>
    )
  }

  function renderMinimalTemplate(material) {
    const chapters = getChapters(material)
    const keyConcepts = getKeyConcepts(material)

    return (
      <article className="newspaper-card minimal-template newspaper-long">
        <div className="minimal-header">
          <span>{material.category}</span>
          <span>{material.language}</span>
          <span>{material.type}</span>
        </div>

        <h4>{material.title}</h4>

        {material.subtitle && <h5>{material.subtitle}</h5>}

        <p>{material.summary}</p>

        <div className="minimal-grid">
          {keyConcepts.slice(0, 6).map((concept, index) => (
            <div key={index}>{concept}</div>
          ))}
        </div>

        <div className="minimal-chapters">
          {chapters.slice(0, 3).map((chapter, index) => (
            <section key={index}>
              <h5>{chapter.title}</h5>
              <p>{chapter.text}</p>
            </section>
          ))}
        </div>

        {renderOpenButton(material)}
      </article>
    )
  }

  function renderTemplate(material, index) {
    if (material.template === "minimal") {
      return renderMinimalTemplate(material)
    }

    return renderMagazineTemplate(material, index)
  }

  return (
    <section className="upload-hub-section notranslate" id="upload" translate="no">
      <div className="upload-hub-hero">
        <span className="upload-hub-badge">{t.badge}</span>
        <h2>{t.title}</h2>
        <p>{t.description}</p>
      </div>

      <div className="upload-steps-3d">
        <GlareHover className="upload-step-card">
          <div className="upload-step-content">
            <span>01</span>
            <h3>{t.languageTitle}</h3>

            <div className="language-grid">
              {languages.map((language) => (
                <button
                  type="button"
                  key={language}
                  className={selectedLanguage === language ? "active" : ""}
                  onClick={() => setSelectedLanguage(language)}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>
        </GlareHover>

        <GlareHover className="upload-step-card">
          <div className="upload-step-content">
            <span>02</span>
            <h3>{t.layoutTitle}</h3>

            <div className="template-grid">
              {templates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  className={`template-card ${
                    selectedTemplate === template.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <strong>{template.name}</strong>
                  <small>{template.description}</small>
                </button>
              ))}
            </div>
          </div>
        </GlareHover>
      </div>

      <GlareHover className="upload-main-card">
        <div className="upload-step-content">
          <span>03</span>
          <h3>{t.documentTitle}</h3>

          <input
            value={materialTitle}
            onChange={(event) => setMaterialTitle(event.target.value)}
            placeholder={t.titlePlaceholder}
            className="upload-title-input"
          />

          <label className="upload-dropzone" htmlFor="material-upload">
            <input
              id="material-upload"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.ppt,.pptx,.js,.jsx,.css,.html,.json"
              onChange={handleUpload}
            />

            <strong>{isGenerating ? t.uploading : t.uploadButton}</strong>
            <small>{t.fileTypes}</small>
          </label>

          {fileName && (
            <p className="upload-file-name">
              {t.lastFile} {fileName}
            </p>
          )}

          {error && <p className="upload-error">{error}</p>}
        </div>
      </GlareHover>

      <div className="upload-menu-block">
        <div className="upload-block-heading">
          <span>04</span>
          <h3>{t.categoriesTitle}</h3>
          <p>{t.categoriesDescription}</p>
        </div>

        <div className="flowing-menu-holder">
          <FlowingMenu
            items={categoryItems}
            speed={15}
            textColor="#ffffff"
            bgColor="rgba(5,8,22,0.72)"
            marqueeBgColor="#00d4ff"
            marqueeTextColor="#020617"
            borderColor="rgba(255,255,255,0.18)"
            onItemClick={(category) => {
              setSelectedCategory(category)
              setTimeout(scrollToNewspapers, 100)
            }}
          />
        </div>
      </div>

      <div className="newspaper-area" id="newspapers">
        <div className="upload-block-heading">
          <span>05</span>
          <h3>{t.newspapersTitle}</h3>
          <p>{t.newspapersDescription}</p>
        </div>

        {materials.length === 0 ? (
          <div className="empty-newspaper-state">
            <h4>{t.emptyTitle}</h4>
            <p>{t.emptyText}</p>
          </div>
        ) : (
          <ScrollStack
            itemDistance={120}
            itemScale={0.025}
            itemStackDistance={42}
            stackPosition="15%"
            scaleEndPosition="7%"
            baseScale={0.9}
            rotationAmount={0.8}
            blurAmount={0.2}
          >
            {(filteredMaterials.length > 0 ? filteredMaterials : materials).map(
              (material, index) => (
                <ScrollStackItem key={material.id}>
                  {renderTemplate(material, index)}
                </ScrollStackItem>
              )
            )}
          </ScrollStack>
        )}
      </div>
    </section>
  )
}