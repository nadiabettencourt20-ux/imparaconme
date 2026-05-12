import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import GlareHover from "../GlareHover/GlareHover"
import "./Forum.css"

function Forum() {
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
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao contactar o Donkei.")
      }

      const data = await response.json()
      const answer = data.answer

      setPosts(
        posts.map((item) =>
          item.id === post.id ? { ...item, donkei_answer: answer } : item
        )
      )

      await supabase
        .from("forum_posts")
        .update({ donkei_answer: answer })
        .eq("id", post.id)
    } catch (error) {
      console.error("Erro Donkei:", error)
      setError("O Donkei não conseguiu responder agora.")
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
    <section className="forum-section" id="forum">
      <div className="forum-intro">
        <span className="forum-badge">Fórum anónimo</span>

        <h2>Aprende informática sem medo de perguntar.</h2>

        <p>
          Publica dúvidas de forma anónima, responde a outras pessoas e usa o
          <strong> Donkei</strong> para transformar explicações difíceis em algo
          simples, direto e fácil de entender.
        </p>
      </div>

      <div className="forum-layout">
        <GlareHover className="forum-composer">
          <div className="forum-composer-content">
            <h3>Faz uma pergunta</h3>

            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Escreve aqui a tua dúvida sobre programação, bases de dados, redes, sistemas operativos..."
            />

            <button type="button" onClick={addQuestion}>
              {loadingPost ? "A publicar..." : "Publicar anonimamente"}
            </button>

            {error && <p className="forum-error">{error}</p>}
          </div>
        </GlareHover>

        <div className="forum-feed">
          {posts.length === 0 ? (
            <div className="forum-empty">
              <h3>Ainda não há perguntas.</h3>
              <p>Publica a primeira dúvida no fórum.</p>
            </div>
          ) : (
            posts.map((post) => (
              <GlareHover className="forum-post" key={post.id}>
                <div className="post-up">
                  <button type="button" onClick={() => upPost(post)}>
                    ↑
                  </button>

                  <span>{post.votes || 0}</span>
                </div>

                <div className="post-content">
                  <div className="post-header">
                    <div className="anonymous-avatar">?</div>

                    <div>
                      <strong>Anónimo</strong>
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                  </div>

                  <p className="post-question">{post.question}</p>

                  <span className="post-tag">#{post.tag || "geral"}</span>

                  <div className="post-actions">
                    <button type="button" onClick={() => activateDonkei(post)}>
                      🐴 Donkei
                    </button>
                  </div>

                  {loadingDonkei === post.id && (
                    <div className="donkei-box">Donkei está a pensar...</div>
                  )}

                  {post.donkei_answer && (
                    <div className="donkei-box">
                      <div className="donkei-title">Donkei explica:</div>
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
                      placeholder="Responder anonimamente..."
                    />

                    <button type="button" onClick={() => addReply(post)}>
                      Responder
                    </button>
                  </div>

                  <div className="replies">
                    {Array.isArray(post.replies) &&
                      post.replies.map((reply) => (
                        <div className="reply" key={reply.id}>
                          <strong>{reply.author || "Anónimo"}</strong>
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