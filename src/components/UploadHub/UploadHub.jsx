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
  title: "Transforma documentos em jornais visuais.",
  description:
    "Envia PDFs, sebentas, códigos ou slides. A IA cria jornais de estudo em layouts visuais modernos.",
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
  newspapersDescription: "Cada upload gera uma página visual diferente.",
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

function normalizeArray(value, fallback = []) {
  return Array.isArray(value) && value.length > 0 ? value : fallback
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
        sections: normalizeArray(aiData.sections, [
          {
            title: "Resumo principal",
            body: aiData.summary || "Resumo do documento.",
          },
        ]),
        highlights: normalizeArray(aiData.highlights, [
          "Documento analisado pela IA",
          "Conteúdo organizado visualmente",
          "Original guardado para consulta",
        ]),
        keywords: normalizeArray(aiData.keywords, [
          "estudo",
          "resumo",
          "revisão",
        ]),
        study_plan: normalizeArray(aiData.study_plan, [
          "Ler o resumo principal",
          "Rever os conceitos",
          "Abrir o original",
          "Praticar exercícios",
        ]),
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
          material.id === data.id ? data : material
        )
      )

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

  function renderMagazineRed(material) {
    const sections = normalizeArray(material.sections)
    const highlights = normalizeArray(material.highlights)

    return (
      <article className="visual-newspaper magazine-red-layout">
        <div className="red-blob red-blob-one" />
        <div className="red-blob red-blob-two" />

        <div className="visual-header">
          <span>{material.category}</span>
          <h4>{material.title}</h4>
          <p>{material.subtitle}</p>
        </div>

        <div className="red-grid">
          <section>
            <h5>{sections[0]?.title || "Introdução"}</h5>
            <p>{sections[0]?.body || material.lead}</p>
          </section>

          <section>
            <h5>{sections[1]?.title || "Conceitos"}</h5>
            <p>{sections[1]?.body || material.summary}</p>
          </section>
        </div>

        <div className="red-highlight-strip">
          {highlights.slice(0, 3).map((item, index) => (
            <div key={index}>
              <strong>0{index + 1}</strong>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <blockquote>{material.quote}</blockquote>

        {renderOwnerActions(material)}
        {renderOpenButton(material)}
      </article>
    )
  }

  function renderBlackWhiteNews(material) {
    const sections = normalizeArray(material.sections)
    const highlights = normalizeArray(material.highlights)

    return (
      <article className="visual-newspaper black-white-layout">
        <div className="news-kicker">NEWS FEATURE</div>

        <h4>{material.title}</h4>
        <p className="news-lead">{material.lead}</p>

        <div className="news-columns">
          {sections.slice(0, 4).map((section, index) => (
            <section key={index}>
              <h5>{section.title}</h5>
              <p>{section.body}</p>
            </section>
          ))}
        </div>

        <div className="big-quote">“{material.quote}”</div>

        <aside>
          {highlights.slice(0, 4).map((item, index) => (
            <span key={index}>{item}</span>
          ))}
        </aside>

        {renderOwnerActions(material)}
        {renderOpenButton(material)}
      </article>
    )
  }

  function renderInfographicCards(material) {
    const highlights = normalizeArray(material.highlights)
    const keywords = normalizeArray(material.keywords)

    return (
      <article className="visual-newspaper infographic-layout">
        <div className="circle-core">
          <span>{material.category}</span>
          <h4>{material.title}</h4>
        </div>

        <div className="info-nodes">
          {highlights.slice(0, 5).map((item, index) => (
            <div key={index} className={`node node-${index + 1}`}>
              <strong>0{index + 1}</strong>
              <p>{item}</p>
            </div>
          ))}
        </div>

        <div className="keyword-row">
          {keywords.slice(0, 8).map((keyword, index) => (
            <span key={index}>{keyword}</span>
          ))}
        </div>

        {renderOwnerActions(material)}
        {renderOpenButton(material)}
      </article>
    )
  }

  function renderTimeline(material) {
    const studyPlan = normalizeArray(material.study_plan)
    const sections = normalizeArray(material.sections)

    return (
      <article className="visual-newspaper timeline-layout">
        <h4>{material.title}</h4>
        <p>{material.subtitle}</p>

        <div className="timeline-line">
          {studyPlan.slice(0, 6).map((step, index) => (
            <div key={index}>
              <strong>{index + 1}</strong>
              <span>{step}</span>
            </div>
          ))}
        </div>

        <div className="timeline-sections">
          {sections.slice(0, 3).map((section, index) => (
            <section key={index}>
              <h5>{section.title}</h5>
              <p>{section.body}</p>
            </section>
          ))}
        </div>

        {renderOwnerActions(material)}
        {renderOpenButton(material)}
      </article>
    )
  }

  function renderAcademicBook(material) {
    const sections = normalizeArray(material.sections)
    const keywords = normalizeArray(material.keywords)

    return (
      <article className="visual-newspaper academic-book-layout">
        <div className="book-page left-page">
          <span>{material.type}</span>
          <h4>{material.title}</h4>
          <p>{material.lead || material.summary}</p>

          <div className="book-keywords">
            {keywords.slice(0, 6).map((keyword, index) => (
              <b key={index}>{keyword}</b>
            ))}
          </div>
        </div>

        <div className="book-page right-page">
          {sections.slice(0, 4).map((section, index) => (
            <section key={index}>
              <h5>{section.title}</h5>
              <p>{section.body}</p>
            </section>
          ))}

          {renderOwnerActions(material)}
          {renderOpenButton(material)}
        </div>
      </article>
    )
  }

  function renderTemplate(material) {
    const style = material.visual_style || material.template || "magazine-red"

    if (style === "black-white-news") return renderBlackWhiteNews(material)
    if (style === "infographic-cards") return renderInfographicCards(material)
    if (style === "timeline-ui") return renderTimeline(material)
    if (style === "academic-book") return renderAcademicBook(material)

    return renderMagazineRed(material)
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
              (material) => (
                <ScrollStackItem key={material.id}>
                  {renderTemplate(material)}
                </ScrollStackItem>
              )
            )}
          </ScrollStack>
        )}
      </div>
    </section>
  )
}