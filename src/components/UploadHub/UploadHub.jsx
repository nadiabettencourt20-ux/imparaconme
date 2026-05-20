import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import FlowingMenu from "../FlowingMenu/FlowingMenu"
import ScrollStack, { ScrollStackItem } from "../ScrollStack/ScrollStack"
import GlareHover from "../GlareHover/GlareHover"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"
import "./UploadHub.css"
import MagazineJournal from "../MagazineJournal";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

const STORAGE_BUCKET = "materials"

const defaultTexts = {
  badge: "Upload inteligente",
  title: "Transforma documentos em jornais visuais.",
  description:
    "Envia PDFs, sebentas, códigos ou slides. A IA cria jornais de estudo em várias páginas visuais.",
  languageTitle: "Escolhe a língua",
  layoutTitle: "Escolhe o layout",
  documentTitle: "Envia o documento",
  titlePlaceholder: "Título do material",
  uploadButton: "Clica para fazer upload",
  uploading: "A criar jornal visual...",
  fileTypes: "PDF, Word, imagem, texto, slides ou código",
  lastFile: "Último ficheiro:",
  categoriesTitle: "Categorias",
  categoriesDescription: "Os materiais são organizados por categorias.",
  newspapersTitle: "Jornais de estudo",
  newspapersDescription: "Cada upload gera várias páginas visuais.",
  emptyTitle: "Ainda não há jornais publicados.",
  emptyText: "Faz upload de um documento para criar o primeiro jornal.",
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
    id: "magazine-red",
    name: "Revista vermelha",
    description: "Curvas, blocos grandes e impacto visual.",
  },
  {
    id: "black-white-news",
    name: "Jornal preto/branco",
    description: "Estilo newspaper editorial.",
  },
  {
    id: "infographic-cards",
    name: "Infográfico",
    description: "Cards, números e pontos principais.",
  },
  {
    id: "timeline-ui",
    name: "Timeline UI",
    description: "História e evolução em sequência.",
  },
  {
    id: "academic-book",
    name: "Livro académico",
    description: "Páginas tipo revista universitária.",
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

function getOwnerSessionId() {
  let id = localStorage.getItem("impara_owner_session_id")

  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem("impara_owner_session_id", id)
  }

  return id
}

function createSafeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeArray(value, fallback = []) {
  return Array.isArray(value) && value.length > 0 ? value : fallback
}

function canDeleteMaterial(material, ownerSessionId) {
  if (material.owner_session_id !== ownerSessionId) return false
  if (!material.created_at) return false

  const createdAt = new Date(material.created_at).getTime()
  const now = Date.now()
  const twoHours = 2 * 60 * 60 * 1000

  return now - createdAt <= twoHours
}

function canEditMaterial(material, ownerSessionId) {
  return material.owner_session_id === ownerSessionId
}

async function readPdfText(file) {
  const arrayBuffer = await file.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise

  let text = ""
  const maxPages = Math.min(pdf.numPages, 80)

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()

    const pageText = content.items
      .map((item) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()

    if (pageText) {
      text += `\n\nPágina ${pageNumber}:\n${pageText}`
    }
  }

  return text.trim().slice(0, 30000)
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

  return `Documento enviado: ${file.name}`
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim())
  } catch {
    return null
  }
}

function normalizePages(aiData) {
  const pages = normalizeArray(aiData.pages, [])

  if (pages.length > 0) return pages

  return [
    {
      layout: "cover",
      title: aiData.title || "Jornal de estudo",
      body: aiData.lead || aiData.summary || "Introdução ao material.",
      blocks: normalizeArray(aiData.highlights, []),
    },
    {
      layout: "article",
      title: "Resumo desenvolvido",
      body: aiData.summary || "Resumo do conteúdo.",
      blocks: normalizeArray(aiData.keywords, []),
    },
    {
      layout: "infographic",
      title: "Conceitos principais",
      body: "Principais pontos para rever.",
      blocks: normalizeArray(aiData.highlights, []),
    },
    {
      layout: "study",
      title: "Guia de estudo",
      body: "Plano para estudar este material.",
      blocks: normalizeArray(aiData.study_plan, []),
    },
  ]
}

export default function UploadHub({ texts = defaultTexts }) {
  const t = { ...defaultTexts, ...texts }

  const [ownerSessionId] = useState(getOwnerSessionId)
  const [selectedLanguage, setSelectedLanguage] = useState("Português")
  const [selectedTemplate, setSelectedTemplate] = useState("magazine-red")
  const [selectedCategory, setSelectedCategory] = useState("Matemática")
  const [fileName, setFileName] = useState("")
  const [materialTitle, setMaterialTitle] = useState("")
  const [materials, setMaterials] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [editForm, setEditForm] = useState({
    title: "",
    subtitle: "",
    summary: "",
  })

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

  function scrollToNewspapers() {
    document
      .getElementById("newspapers")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
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

    if (error) throw error

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

      if (!fileText || fileText.trim().length < 40) {
        throw new Error("Não foi possível ler conteúdo suficiente do documento.")
      }

      const originalUrl = await uploadOriginalFile(file)
      const aiData = await generateNewspaperData({ title, file, fileText })

      const category = categoryImages[aiData.category]
        ? aiData.category
        : "Matemática"

      const visualStyle =
        aiData.visual_style || selectedTemplate || "magazine-red"

      const newMaterial = {
        title: aiData.title || title,
        subtitle: aiData.subtitle || "Jornal visual de estudo",
        category,
        language: selectedLanguage,
        template: visualStyle,
        visual_style: visualStyle,
        summary: aiData.summary || "Material organizado para estudo.",
        lead: aiData.lead || aiData.summary || "Introdução ao material.",
        sections: normalizeArray(aiData.sections, []),
        highlights: normalizeArray(aiData.highlights, []),
        keywords: normalizeArray(aiData.keywords, []),
        study_plan: normalizeArray(aiData.study_plan, []),
        pages: normalizePages(aiData),
        quote:
          aiData.quote ||
          "Organizar conhecimento é tornar o estudo mais claro.",
        type: aiData.type || "Jornal de estudo",
        original_name: file.name,
        original_url: originalUrl,
        preview_image: categoryImages[category],
        owner_session_id: ownerSessionId,
        editable_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      }

      const { data, error } = await supabase
        .from("materials")
        .insert([newMaterial])
        .select()
        .single()

      if (error) throw error

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

  function startEdit(material) {
    setEditingMaterial(material)
    setEditForm({
      title: material.title || "",
      subtitle: material.subtitle || "",
      summary: material.summary || "",
    })
  }

  async function saveEdit() {
    if (!editingMaterial) return

    try {
      const { data, error } = await supabase
        .from("materials")
        .update({
          title: editForm.title,
          subtitle: editForm.subtitle,
          summary: editForm.summary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingMaterial.id)
        .eq("owner_session_id", ownerSessionId)
        .select()
        .single()

      if (error) throw error

      setMaterials(
        materials.map((material) =>
      <div className="journal-list">

     {materials.map((material) => (

     <MagazineJournal
      key={material.id}
      newspaper={material}
      canDelete={true}
      onDelete={handleDeleteMaterial}
    />

  ))}

</div>

      setEditingMaterial(null)
    } catch (err) {
      setError(err.message || "Não foi possível atualizar o jornal.")
    }
  }

  async function deleteMaterial(material) {
    if (!canDeleteMaterial(material, ownerSessionId)) {
      setError("Só podes apagar este jornal até 2 horas depois de publicares.")
      return
    }

    const confirmDelete = window.confirm(
      "Tens a certeza que queres apagar este jornal?"
    )

    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from("materials")
        .delete()
        .eq("id", material.id)
        .eq("owner_session_id", ownerSessionId)

      if (error) throw error

      setMaterials(materials.filter((item) => item.id !== material.id))
    } catch (err) {
      setError(err.message || "Não foi possível apagar o jornal.")
    }
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

  function renderOwnerActions(material) {
    const isOwner = material.owner_session_id === ownerSessionId

    if (!isOwner) return null

    return (
      <div className="newspaper-owner-actions">
        {canEditMaterial(material, ownerSessionId) && (
          <button type="button" onClick={() => startEdit(material)}>
            Editar
          </button>
        )}

        {canDeleteMaterial(material, ownerSessionId) && (
          <button
            type="button"
            className="danger"
            onClick={() => deleteMaterial(material)}
          >
            Apagar
          </button>
        )}
      </div>
    )
  }

  function renderCoverPage(material, page, pageIndex) {
    return (
      <section className="journal-page journal-cover-page">
        <div className="journal-page-number">PÁGINA {pageIndex + 1}</div>
        <div className="journal-cover-image">
          <img
            src={material.preview_image || categoryImages[material.category]}
            alt={material.category}
          />
        </div>

        <div className="journal-cover-content">
          <span>{material.category}</span>
          <h4>{material.title}</h4>
          <p>{material.subtitle}</p>
          <blockquote>“{material.quote}”</blockquote>
        </div>
      </section>
    )
  }

  function renderArticlePage(material, page, pageIndex) {
    return (
      <section className="journal-page journal-article-page">
        <div className="journal-page-number">PÁGINA {pageIndex + 1}</div>
        <span className="journal-kicker">{material.type}</span>

        <h4>{page.title}</h4>
        <p className="journal-lead">{page.body}</p>

        <div className="journal-article-columns">
          {normalizeArray(page.blocks, []).map((block, index) => (
            <div key={index}>
              <strong>0{index + 1}</strong>
              <p>{block}</p>
            </div>
          ))}
        </div>
      </section>
    )
  }

  function renderInfographicPage(material, page, pageIndex) {
    return (
      <section className="journal-page journal-infographic-page">
        <div className="journal-page-number">PÁGINA {pageIndex + 1}</div>

        <div className="journal-infographic-core">
          <span>{material.category}</span>
          <h4>{page.title}</h4>
          <p>{page.body}</p>
        </div>

        <div className="journal-infographic-grid">
          {normalizeArray(page.blocks, []).map((block, index) => (
            <div key={index}>
              <strong>{index + 1}</strong>
              <span>{block}</span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  function renderStudyPage(material, page, pageIndex) {
    return (
      <section className="journal-page journal-study-page">
        <div className="journal-page-number">PÁGINA {pageIndex + 1}</div>

        <h4>{page.title}</h4>
        <p>{page.body}</p>

        <ol>
          {normalizeArray(page.blocks, []).map((block, index) => (
            <li key={index}>{block}</li>
          ))}
        </ol>
      </section>
    )
  }

  function renderGenericPage(material, page, pageIndex) {
    if (page.layout === "cover") return renderCoverPage(material, page, pageIndex)
    if (page.layout === "infographic") {
      return renderInfographicPage(material, page, pageIndex)
    }
    if (page.layout === "study" || page.layout === "timeline") {
      return renderStudyPage(material, page, pageIndex)
    }

    return renderArticlePage(material, page, pageIndex)
  }

  function renderMaterial(material) {
    const pages = normalizePages(material)
    const style = material.visual_style || material.template || "magazine-red"

    return (
      <article className={`multi-page-journal ${style}`}>
        <div className="journal-actions-top">
          {renderOwnerActions(material)}
          {renderOpenButton(material)}
        </div>

        {pages.map((page, pageIndex) => (
          <div key={pageIndex}>{renderGenericPage(material, page, pageIndex)}</div>
        ))}
      </article>
    )
  }

  return (
    <section
      className="upload-hub-section notranslate"
      id="upload"
      translate="no"
    >
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

        {editingMaterial && (
          <div className="edit-newspaper-panel">
            <h3>Editar jornal</h3>

            <input
              value={editForm.title}
              onChange={(event) =>
                setEditForm({ ...editForm, title: event.target.value })
              }
              placeholder="Título"
            />

            <input
              value={editForm.subtitle}
              onChange={(event) =>
                setEditForm({ ...editForm, subtitle: event.target.value })
              }
              placeholder="Subtítulo"
            />

            <textarea
              value={editForm.summary}
              onChange={(event) =>
                setEditForm({ ...editForm, summary: event.target.value })
              }
              placeholder="Resumo"
            />

            <button type="button" onClick={saveEdit}>
              Guardar alterações
            </button>

            <button type="button" onClick={() => setEditingMaterial(null)}>
              Cancelar
            </button>
          </div>
        )}

        {materials.length === 0 ? (
          <div className="empty-newspaper-state">
            <h4>{t.emptyTitle}</h4>
            <p>{t.emptyText}</p>
          </div>
        ) : (
          <div className="journal-list">
            {(filteredMaterials.length > 0 ? filteredMaterials : materials).map(
              (material) => (
                <div key={material.id}>{renderMaterial(material)}</div>
              )
            )}
          </div>
        )}
      </div>
    </section>
  )
}

const handleDeleteMaterial = async (id) => {

  const confirmDelete = window.confirm(
    "Eliminar este jornal?"
  );

  if (!confirmDelete) return;

  await supabase
    .from("materials")
    .delete()
    .eq("id", id);

  setMaterials((prev) =>
    prev.filter((m) => m.id !== id)
  );
};