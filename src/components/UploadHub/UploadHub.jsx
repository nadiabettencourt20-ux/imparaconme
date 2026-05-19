import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import FlowingMenu from "../FlowingMenu/FlowingMenu"
import ScrollStack, { ScrollStackItem } from "../ScrollStack/ScrollStack"
import GlareHover from "../GlareHover/GlareHover"
import "./UploadHub.css"

const STORAGE_BUCKET = "materials"

const defaultTexts = {
  badge: "Upload inteligente",
  title: "Transforma documentos em jornais de estudo.",
  description:
    "Envia sebentas, PDFs, resumos ou códigos. O sistema organiza o material e cria layouts modernos inspirados em revistas e jornais.",
  languageTitle: "Escolhe a língua",
  layoutTitle: "Escolhe o layout",
  documentTitle: "Envia o documento",
  titlePlaceholder: "Título do material",
  uploadButton: "Clica para fazer upload",
  uploading: "A publicar o material...",
  fileTypes: "PDF, Word, imagem, texto, slides ou código",
  lastFile: "Último ficheiro:",
  categoriesTitle: "Categorias",
  categoriesDescription:
    "Os materiais são organizados por categorias para facilitar a navegação.",
  newspapersTitle: "Jornais de estudo",
  newspapersDescription: "Cada upload gera um layout visual diferente.",
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
    description: "Imagem grande, título forte e composição tipo capa.",
  },
  {
    id: "magazine",
    name: "Revista limpa",
    description: "Layout claro, elegante, inspirado em revistas modernas.",
  },
  {
    id: "columns",
    name: "Colunas jornal",
    description: "Visual académico organizado em blocos e colunas.",
  },
  {
    id: "image-focus",
    name: "Imagem principal",
    description: "Grande destaque visual com resumo abaixo.",
  },
  {
    id: "cards",
    name: "Cards informativos",
    description: "Pequenos blocos rápidos para estudar.",
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

async function readFileText(file) {
  const textTypes = [
    "text/plain",
    "text/javascript",
    "text/css",
    "text/html",
    "application/json",
  ]

  if (textTypes.includes(file.type) || file.name.endsWith(".txt")) {
    return await file.text()
  }

  return ""
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch {
    return null
  }
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

    if (!error) setMaterials(data || [])
  }

  async function generateNewspaperData({ title, file, fileText }) {
    const response = await fetch("/api/generate-newspaper", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        fileName: file.name,
        fileType: file.type,
        fileText,
        language: selectedLanguage,
      }),
    })

    if (!response.ok) {
      throw new Error("Erro ao gerar jornal.")
    }

    const data = await response.json()

    const aiData = safeJsonParse(data.content)

    if (!aiData) {
      throw new Error("Resposta inválida da IA.")
    }

    return aiData
  }

  async function uploadOriginalFile(file) {
    const safeName = file.name
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.-]/g, "")

    const filePath = `${Date.now()}-${safeName}`

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

    const title =
      materialTitle.trim() ||
      file.name.replace(/\.[^/.]+$/, "")

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
        : "Programação"

      const newMaterial = {
        title: aiData.title || title,
        category,
        language: selectedLanguage,
        template: selectedTemplate,
        summary:
          aiData.summary || "Resumo criado automaticamente.",
        highlights: Array.isArray(aiData.highlights)
          ? aiData.highlights.slice(0, 3)
          : [
              "Documento organizado.",
              "Resumo criado.",
              "Original guardado.",
            ],
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

      setMaterialTitle("")
    } catch (err) {
      console.error(err)

      setError(
        err?.message ||
          "Não foi possível publicar o material agora."
      )
    }

    setIsGenerating(false)
  }

  return (
    <section
      className="upload-hub-section notranslate"
      id="upload"
      translate="no"
    >
      <div className="upload-hub-hero">
        <span className="upload-hub-badge">
          {t.badge}
        </span>

        <h2>{t.title}</h2>

        <p>{t.description}</p>
      </div>

      <GlareHover className="upload-main-card">
        <div className="upload-step-content">
          <span>03</span>

          <h3>{t.documentTitle}</h3>

          <input
            value={materialTitle}
            onChange={(event) =>
              setMaterialTitle(event.target.value)
            }
            placeholder={t.titlePlaceholder}
            className="upload-title-input"
          />

          <label
            className="upload-dropzone"
            htmlFor="material-upload"
          >
            <input
              id="material-upload"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.ppt,.pptx,.js,.jsx,.css,.html,.json"
              onChange={handleUpload}
            />

            <strong>
              {isGenerating
                ? t.uploading
                : t.uploadButton}
            </strong>

            <small>{t.fileTypes}</small>
          </label>

          {fileName && (
            <p className="upload-file-name">
              {t.lastFile} {fileName}
            </p>
          )}

          {error && (
            <p className="upload-error">
              {error}
            </p>
          )}
        </div>
      </GlareHover>
    </section>
  )
}