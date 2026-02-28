import { db } from "../lib/firebaseAdmin";
import Navigation from "../components/navigation";
import Footer from "../components/footer";

export async function getServerSideProps() {
  const snapshot = await db.collection("streams").get();
  const items = snapshot.docs.map(doc => doc.data());

  return { props: { items } };
}

export default function StreamsPage({ items }) {
  return (
    <>
      <Navigation />

      <main className="category-page">
        <h1 className="category-title">Streams</h1>

        {items.length === 0 && (
          <p className="empty-message">No data available yet.</p>
        )}

        <div className="category-grid">
          {items.map((item, i) => (
            <div key={i} className="category-card">
              <div className="category-card-image">
                <img
                  src={item.image_url || "/placeholder.png"}
                  alt={item.title}
                />
              </div>

              <h3 className="category-card-title">{item.title}</h3>

              <p className="category-card-description">
                {item.description}
              </p>

              {item.source_name && (
                <p className="category-card-source">
                  Source: {item.source_name}
                </p>
              )}

              {item.tags?.length > 0 && (
                <div className="category-card-tags">
                  {item.tags.map((tag, idx) => (
                    <span key={idx} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-link"
                >
                  <span>Open</span>
                </a>
              )}
            </div>
          ))}
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .category-page {
          padding: 40px;
          max-width: 1200px;
          margin: auto;
        }
        .category-title {
          font-size: 42px;
          margin-bottom: 30px;
          color: var(--color-on-secondary);
        }
        .empty-message {
          opacity: 0.7;
        }
        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }
        .category-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 20px;
          transition: border-color 0.3s ease;
        }
        .category-card:hover {
          border-color: var(--color-accent);
        }
        .category-card-image img {
          width: 100%;
          height: 160px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .category-card-title {
          font-size: 20px;
          margin-bottom: 8px;
          color: var(--color-on-secondary);
        }
        .category-card-description {
          opacity: 0.8;
          margin-bottom: 12px;
        }
        .category-card-source {
          font-size: 14px;
          opacity: 0.7;
          margin-bottom: 12px;
        }
        .category-card-tags {
          margin-bottom: 12px;
        }
        .tag {
          display: inline-block;
          background: var(--color-border);
          padding: 4px 8px;
          border-radius: 6px;
          margin-right: 6px;
          font-size: 12px;
        }
        .btn-link {
          display: inline-block;
          padding: 10px 16px;
          border: 1px solid var(--color-accent);
          border-radius: 8px;
          color: var(--color-accent);
          text-align: center;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
