import { useState } from "react"
import OpenAI from "openai"
import GlareHover from "../GlareHover/GlareHover"
import "./Forum.css"

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})

function Forum() {
  const [posts, setPosts] = useState([
    {
      id: 1,
      author: "Anónimo #2048",
      time: "agora",
      question: "O que é uma API e para que serve?",
      tag: "programação",
      ups: 12,
      replies: [
        {
          id: 1,
          author: "Anónimo #7812",
          text: "Uma API é como uma ponte entre dois programas. Um programa pede algo e o outro responde.",
        },
      ],
    },
    {
      id: 2,
      author: "Anónimo #3901",
      time: "há 5 min",
      question: "Qual é a diferença entre frontend e backend?",
      tag: "web",
      ups: 8,
      replies: [],
    },
  ])

  const [question, setQuestion] = useState("")
  const [replyTexts, setReplyTexts] = useState({})
  const [donkeiResponses, setDonkeiResponses] = useState({})
  const [loadingDonkei, setLoadingDonkei] = useState(null)

  function addQuestion() {
    if (!question.trim()) return

    const newPost = {
      id: Date.now(),
      author: `Anónimo #${Math.floor(Math.random() * 9000 + 1000)}`,
      time: "agora",
      question,
      tag: "informática",
      ups: 0,
      replies: [],
    }

    setPosts([newPost, ...posts])
    setQuestion("")
  }

  function upPost(id) {
    setPosts(
      posts.map((post) =>
        post.id === id ? { ...post, ups: post.ups + 1 } : post
      )
    )
  }

  function addReply(postId) {
    const replyText = replyTexts[postId]

    if (!replyText || !replyText.trim()) return

    setPosts(
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              replies: [
                ...post.replies,
                {
                  id: Date.now(),
                  author: `Anónimo #${Math.floor(Math.random() * 9000 + 1000)}`,
                  text: replyText,
                },
              ],
            }
          : post
      )
    )

    setReplyTexts({ ...replyTexts, [postId]: "" })
  }

  async function activateDonkei(post) {
    setLoadingDonkei(post.id)

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu és o Donkei, uma IA que explica informática da forma mais simples possível, como se estivesse a explicar a uma criança ou a alguém sem conhecimentos técnicos.",
          },
          {
            role: "user",
            content: post.question,
          },
        ],
      })

      setDonkeiResponses((prev) => ({
        ...prev,
        [post.id]: response.choices[0].message.content,
      }))
    } catch (error) {
      setDonkeiResponses((prev) => ({
        ...prev,
        [post.id]: "Erro ao contactar o Donkei. Verifica a API key.",
      }))
    }

    setLoadingDonkei(null)
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

            <button onClick={addQuestion}>Publicar anonimamente</button>
          </div>
        </GlareHover>

        <div className="forum-feed">
          {posts.map((post) => (
            <GlareHover className="forum-post" key={post.id}>
              <div className="post-up">
                <button onClick={() => upPost(post.id)}>↑</button>
                <span>{post.ups}</span>
              </div>

              <div className="post-content">
                <div className="post-header">
                  <div className="anonymous-avatar">?</div>

                  <div>
                    <strong>{post.author}</strong>
                    <span>{post.time}</span>
                  </div>
                </div>

                <p className="post-question">{post.question}</p>

                <span className="post-tag">#{post.tag}</span>

                <div className="post-actions">
                  <button onClick={() => activateDonkei(post)}>
                    🐴 Donkei
                  </button>
                </div>

                {loadingDonkei === post.id && (
                  <div className="donkei-box">
                    Donkei está a pensar...
                  </div>
                )}

                {donkeiResponses[post.id] && (
                  <div className="donkei-box">
                    <div className="donkei-title">Donkei explica:</div>
                    <p>{donkeiResponses[post.id]}</p>
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

                  <button onClick={() => addReply(post.id)}>Responder</button>
                </div>

                <div className="replies">
                  {post.replies.map((reply) => (
                    <div className="reply" key={reply.id}>
                      <strong>{reply.author}</strong>
                      <p>{reply.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </GlareHover>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Forum