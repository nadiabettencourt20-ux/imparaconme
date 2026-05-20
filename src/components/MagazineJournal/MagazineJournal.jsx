import "./MagazineJournal.css";

export default function MagazineJournal({
  newspaper,
  onDelete,
  canDelete,
}) {

  if (!newspaper) return null;

  const pages = newspaper.pages || [];

  return (
    <div className="magazine-wrapper">

      {pages.map((page, index) => (

        <section
          key={index}
          className={`mag-page layout-${page.layout || "editorial"}`}
        >

          <div className="mag-page-number">
            {String(index + 1).padStart(2, "0")}
          </div>

          {page.coverImage && (
            <div className="mag-hero">
              <img
                src={page.coverImage}
                alt=""
              />
            </div>
          )}

          <div className="mag-content">

            <div className="mag-tags">
              <span>{page.category || "Academico"}</span>
              <span>{page.language || "Italiano"}</span>
              <span>Journal</span>
            </div>

            <h1>{page.title}</h1>

            <p className="mag-subtitle">
              {page.subtitle}
            </p>

            {page.quote && (
              <blockquote>
                “{page.quote}”
              </blockquote>
            )}

            {page.sections?.length > 0 && (
              <div className="mag-grid">

                {page.sections.map((section, i) => (

                  <div
                    key={i}
                    className="mag-card"
                  >

                    <strong>
                      {String(i + 1).padStart(2, "0")}
                    </strong>

                    <h3>
                      {section.heading}
                    </h3>

                    <p>
                      {section.text}
                    </p>

                  </div>

                ))}

              </div>
            )}

            {page.timeline?.length > 0 && (

              <div className="timeline">

                {page.timeline.map((item, i) => (

                  <div
                    key={i}
                    className="timeline-item"
                  >

                    <div className="timeline-dot" />

                    <div>
                      <h4>{item.year}</h4>
                      <p>{item.text}</p>
                    </div>

                  </div>

                ))}

              </div>

            )}

            <div className="mag-buttons">

              <a
                href={newspaper.originalUrl}
                target="_blank"
                rel="noreferrer"
                className="open-btn"
              >
                Apri originale
              </a>

              {canDelete && (
                <button
                  className="delete-btn"
                  onClick={() => onDelete(newspaper.id)}
                >
                  Eliminar
                </button>
              )}

            </div>

          </div>

        </section>

      ))}

    </div>
  );
}