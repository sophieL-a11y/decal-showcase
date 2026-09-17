"use client";

import { useEffect, useMemo, useState } from "react";

const PREVIEWABLE = new Set(["html", "htm"]);

function extOf(path) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(iso) {
  if (!iso) return "Unknown time";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedFilePath, setSelectedFilePath] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError("");
    try {
      const res = await fetch("/api/admin/submissions", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't load submissions.");
        return;
      }
      setSubmissions(data.submissions);
      if (data.submissions.length > 0 && !selectedId) {
        setSelectedId(data.submissions[0].id);
      }
    } catch {
      setError("Couldn't reach the server.");
    }
  }

  const selected = useMemo(
    () => (submissions || []).find((s) => s.id === selectedId) || null,
    [submissions, selectedId]
  );

  useEffect(() => {
    setSelectedFilePath(null);
    setPreviewHtml(null);
  }, [selectedId]);

  async function openFile(file) {
    setSelectedFilePath(file.path);
    if (PREVIEWABLE.has(extOf(file.path))) {
      setPreviewLoading(true);
      setPreviewHtml(null);
      try {
        const res = await fetch(file.url, { cache: "no-store" });
        const text = await res.text();
        setPreviewHtml(text);
      } catch {
        setPreviewHtml(null);
      } finally {
        setPreviewLoading(false);
      }
    } else {
      setPreviewHtml(null);
    }
  }

  const selectedFile = selected?.files.find((f) => f.path === selectedFilePath) || null;

  return (
    <main style={styles.page}>
      <header style={styles.topbar}>
        <div>
          <p style={styles.kicker}>Full-Stack DeCal</p>
          <h1 style={styles.title}>Responses</h1>
        </div>
        <div style={styles.topbarRight}>
          <a href="/" style={styles.link}>
            Upload page
          </a>
        </div>
      </header>

      {error && <p style={styles.error}>{error}</p>}

      {error ? null : submissions === null ? (
        <p style={styles.muted}>Loading…</p>
      ) : submissions.length === 0 ? (
        <p style={styles.muted}>No submissions yet.</p>
      ) : (
        <div style={styles.layout}>
          <aside style={styles.list}>
            {submissions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                style={s.id === selectedId ? styles.listItemActive : styles.listItem}
              >
                <span style={styles.listItemName}>{s.name}</span>
                <span style={styles.listItemMeta}>
                  {formatWhen(s.submittedAt)} · {s.fileCount} file{s.fileCount === 1 ? "" : "s"}
                </span>
              </button>
            ))}
          </aside>

          <section style={styles.detail}>
            {selected && (
              <>
                <div style={styles.detailHeader}>
                  <h2 style={styles.detailTitle}>{selected.name}</h2>
                  <p style={styles.detailMeta}>
                    Submitted {formatWhen(selected.submittedAt)}
                  </p>
                </div>

                <div style={styles.fileTree}>
                  {selected.files.map((f) => (
                    <button
                      key={f.path}
                      onClick={() => openFile(f)}
                      style={
                        f.path === selectedFilePath ? styles.fileRowActive : styles.fileRow
                      }
                    >
                      <span style={styles.filePath}>{f.path}</span>
                      <span style={styles.fileMeta}>{formatBytes(f.size)}</span>
                    </button>
                  ))}
                </div>

                {selectedFile && (
                  <div style={styles.previewPanel}>
                    <div style={styles.previewHeader}>
                      <span style={styles.filePath}>{selectedFile.path}</span>
                      <a
                        href={selectedFile.url}
                        download={selectedFile.path.split("/").pop()}
                        style={styles.downloadLink}
                      >
                        Download
                      </a>
                    </div>
                    {previewLoading ? (
                      <p style={styles.muted}>Loading preview…</p>
                    ) : previewHtml !== null ? (
                      <iframe
                        title={selectedFile.path}
                        srcDoc={previewHtml}
                        sandbox="allow-scripts"
                        style={styles.iframe}
                      />
                    ) : (
                      <p style={styles.muted}>
                        No inline preview for this file type — use Download to open it.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 32px 60px",
    maxWidth: 1100,
    margin: "0 auto",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 28,
    flexWrap: "wrap",
    gap: 12,
  },
  kicker: {
    margin: 0,
    fontFamily: "var(--mono)",
    fontSize: 13,
    color: "var(--ink-soft)",
  },
  title: {
    margin: "4px 0 0",
    fontSize: 28,
    fontWeight: 600,
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  link: {
    fontSize: 13.5,
    color: "var(--ink-soft)",
    textDecoration: "none",
  },
  error: {
    color: "var(--error)",
    fontSize: 14,
  },
  muted: {
    color: "var(--ink-soft)",
    fontSize: 14,
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: 20,
    alignItems: "start",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    padding: 8,
  },
  listItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 3,
    padding: "9px 10px",
    border: "none",
    borderRadius: "var(--radius)",
    background: "transparent",
    color: "var(--ink)",
    cursor: "pointer",
    textAlign: "left",
  },
  listItemActive: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 3,
    padding: "9px 10px",
    border: "none",
    borderRadius: "var(--radius)",
    background: "var(--bg)",
    color: "var(--ink)",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "inset 2px 0 0 var(--accent)",
  },
  listItemName: {
    fontSize: 14,
    fontWeight: 600,
  },
  listItemMeta: {
    fontSize: 11.5,
    color: "var(--ink-soft)",
    fontFamily: "var(--mono)",
  },
  detail: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minWidth: 0,
  },
  detailHeader: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    padding: "16px 18px",
  },
  detailTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
  },
  detailMeta: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "var(--ink-soft)",
  },
  fileTree: {
    display: "flex",
    flexDirection: "column",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  fileRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "9px 14px",
    border: "none",
    borderBottom: "1px solid var(--line-soft)",
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
  },
  fileRowActive: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "9px 14px",
    border: "none",
    borderBottom: "1px solid var(--line-soft)",
    background: "var(--bg)",
    cursor: "pointer",
    textAlign: "left",
  },
  filePath: {
    fontFamily: "var(--mono)",
    fontSize: 12.5,
    color: "var(--ink)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileMeta: {
    fontFamily: "var(--mono)",
    fontSize: 11.5,
    color: "var(--ink-soft)",
    whiteSpace: "nowrap",
  },
  previewPanel: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  downloadLink: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "var(--accent-ink)",
    textDecoration: "none",
  },
  iframe: {
    width: "100%",
    height: 480,
    border: "1px solid var(--line-soft)",
    borderRadius: "var(--radius)",
    background: "#fff",
  },
};
