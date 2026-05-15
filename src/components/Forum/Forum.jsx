import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import GlareHover from "../GlareHover/GlareHover"
import "./Forum.css"

const defaultTexts = {
  badge: "Fórum anónimo",
  title: "Aprende informática sem medo de perguntar.",
  description:
    "Publica dúvidas de forma anónima, responde a outras pessoas e usa o Donkei para transformar explicações difíceis em algo simples, direto e fácil de entender.",
  askTitle: "Faz uma pergunta",
  placeholder:
    "Escreve aqui a tua dúvida sobre programação, bases de dados, redes, sistemas operativos...",
  publish: "Publicar anonimamente",
  publishing: "A publicar...",
  emptyTitle: "Ainda não há perguntas.",
  emptyText: "Publica a primeira dúvida no fórum.",
  anonymous: "Anónimo",
  general: "geral",
  donkeiThinking: "Donkei está a pensar...",
  donkeiExplains: "Donkei explica:",
  replyPlaceholder: "Responder anonimamente...",
  reply: "Responder",
}

function Forum({ texts = defaultTexts }) {
  const t = { ...defaultTexts, ...texts }

  const [posts, setPosts] = useState([])
  const [question, setQuestion] = useState("")
  const [replyTexts, setReplyTexts] = useState({})
  const [loadingPost, setLoadingPost] = useState(false)
  const [loadingDonkei, setLoadingDonkei] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    const { data, error } = await supabase
      .from("forum_posts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao carregar fórum:", error)
      setError("Não foi possível carregar o fórum.")
      return
    }

    setPosts(data || [])
  }

  async function addQuestion() {
    if (!question.trim()) return

    setLoadingPost(true)
    setError("")

    const newPost = {
      question: question.trim(),
      tag: "informática",
      votes: 0,
      replies: [],
      donkei_answer: null,
    }

    const { data, error } = await supabase
      .from("forum_posts")
      .insert([newPost])
      .select()
      .single()

    if (error) {
      console.error("Erro ao publicar:", error)
      setError(`Não foi possível publicar a pergunta: ${error.message}`)
      setLoadingPost(false)
      return
    }

    setPosts([data, ...posts])
    setQuestion("")
    setLoadingPost(false)
  }

  async function upPost(post) {
    const newVotes = (post.votes || 0) + 1

    setPosts(
      posts.map((item) =>
        item.id === post.id ? { ...item, votes: newVotes } : item
      )
    )

    await supabase
      .from("forum_posts")
      .update({ votes: newVotes })
      .eq("id", post.id)
  }

  async function addReply(post) {
    const replyText = replyTexts[post.id]

    if (!replyText || !replyText.trim()) return

    const newReply = {
      id: Date.now(),
      author: `Anónimo #${Math.floor(Math.random() * 9000 + 1000)}`,
      text: replyText.trim(),
    }

    const updatedReplies = Array.isArray(post.replies)
      ? [...post.replies, newReply]
      : [newReply]

    setPosts(
      posts.map((item) =>
        item.id === post.id ? { ...item, replies: updatedReplies } : item
      )
    )

    setReplyTexts({ ...replyTexts, [post.id]: "" })

    await supabase
      .from("forum_posts")
      .update({ replies: updatedReplies })
      .eq("id", post.id)
  }

  async function activateDonkei(post) {
    setLoadingDonkei(post.id)
    setError("")

    try {
      const response = await fetch("/api/forum-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: post.question,
          lang: navigator.language?.split("-")[0] || "pt",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao contactar o Donkei.")
      }

      const answer = data.answer

      setPosts(
        posts.map((item) =>
          item.id === post.id
            ? { ...item, donkei_answer: answer }
            : item
        )
      )

      await supabase
        .from("forum_posts")
        .update({ donkei_answer: answer })
        .eq("id", post.id)
    } catch (error) {
      console.error("Erro Donkei:", error)
      setError(error.message || "O Donkei não conseguiu responder agora.")
    }

    setLoadingDonkei(null)
  }

  function formatDate(date) {
    if (!date) return "agora"

    return new Date(date).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <section className="forum-section notranslate" id="forum" translate="no">
      <div className="forum-intro">
        <span className="forum-badge">{t.badge}</span>

        <h2>{t.title}</h2>

        <p>{t.description}</p>
      </div>

      <div className="forum-layout">
        <GlareHover className="forum-composer">
          <div className="forum-composer-content">
            <h3>{t.askTitle}</h3>

            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={t.placeholder}
            />

            <button type="button" onClick={addQuestion}>
              {loadingPost ? t.publishing : t.publish}
            </button>

            {error && <p className="forum-error">{error}</p>}
          </div>
        </GlareHover>

        <div className="forum-feed">
          {posts.length === 0 ? (
            <div className="forum-empty">
              <h3>{t.emptyTitle}</h3>
              <p>{t.emptyText}</p>
            </div>
          ) : (
            posts.map((post) => (
              <GlareHover className="forum-post" key={post.id}>
                <div className="post-up">
                  <button type="button" onClick={() => upPost(post)}>
                    <span className="notranslate" translate="no">
                      ↑
                    </span>
                  </button>

                  <span className="notranslate" translate="no">
                    {post.votes || 0}
                  </span>
                </div>

                <div className="post-content">
                  <div className="post-header">
                    <div className="anonymous-avatar notranslate" translate="no">
                      ?
                    </div>

                    <div>
                      <strong>{t.anonymous}</strong>
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                  </div>

                  <p className="post-question">{post.question}</p>

                  <span className="post-tag">#{post.tag || t.general}</span>

                  <div className="post-actions">
                    <button
                      type="button"
                      className="notranslate"
                      translate="no"
                      onClick={() => activateDonkei(post)}
                    >
                      🐴 Donkei
                    </button>
                  </div>

                  {loadingDonkei === post.id && (
                    <div className="donkei-box">{t.donkeiThinking}</div>
                  )}

                  {post.donkei_answer && (
                    <div className="donkei-box">
                      <div className="donkei-title notranslate" translate="no">
                        {t.donkeiExplains}
                      </div>

                      <p>{post.donkei_answer}</p>
                    </div>
                  )}

                  <div className="reply-box">
                    <input
                      value={replyTexts[post.id] || ""}
                      onChange={(event) =>
                        setReplyTexts({
                          ...replyTexts,
                          [post.id]: event.target.value,
                        })
                      }
                      placeholder={t.replyPlaceholder}
                    />

                    <button type="button" onClick={() => addReply(post)}>
                      {t.reply}
                    </button>
                  </div>

                  <div className="replies">
                    {Array.isArray(post.replies) &&
                      post.replies.map((reply) => (
                        <div className="reply" key={reply.id}>
                          <strong>{reply.author || t.anonymous}</strong>
                          <p>{reply.text}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </GlareHover>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export default Forum