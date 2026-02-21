import { db } from "../lib/firebaseAdmin";

export async function getServerSideProps() {
  const snapshot = await db.collection("ai_tools").get();
  const tools = snapshot.docs.map(doc => doc.data());

  return {
    props: { tools },
  };
}

export default function AiToolsPage({ tools }) {
  return (
    <main style={{ padding: "20px" }}>
      <h1>AI Tools</h1>

      {tools.length === 0 && <p>No tools found yet.</p>}

      <div style={{ display: "grid", gap: "20px" }}>
        {tools.map((tool, i) => (
          <div key={i} style={{
            padding: "15px",
            border: "1px solid #ddd",
            borderRadius: "8px"
          }}>
            <h3>{tool.title}</h3>
            <p>{tool.description}</p>
            <a href={tool.url} target="_blank" rel="noreferrer">
              Visit
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}
