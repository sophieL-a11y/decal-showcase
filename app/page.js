"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

function makeSubmissionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function relativePath(file) {
  // webkitRelativePath is set when the file came from a <input webkitdirectory>
  // folder pick, e.g. "my-project/css/style.css". Falls back to the bare
  // filename for a regular file pick.
  return file.webkitRelativePath || file.name;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const [name, setName] = useState("");
  const [mode, setMode] = useState("files"); // "files" | "folder"
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [submissionId, setSubmissionId] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const totalBytes = selected.reduce((sum, f) => sum + f.size, 0);

  function handlePick(e) {
    setSelected(Array.from(e.target.files || []));
    setStatus("idle");
    setErrorMessage("");
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setSelected([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Add your name so we know whose project this is.");
      return;
    }
    if (selected.length === 0) {
      setErrorMessage(
        mode === "folder" ? "Choose a project folder first." : "Choose at least one file first."
      );
      return;
    }

    setStatus("uploading");
    setErrorMessage("");
    setProgress(0);

    const id = makeSubmissionId();
    const uploadedBytesByFile = new Array(selected.length).fill(0);

    try {
      for (let i = 0; i < selected.length; i++) {
        const file = selected[i];
        const pathname = `submissions/${id}/${relativePath(file)}`;
        await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: JSON.stringify({ submissionId: id }),
          onUploadProgress: ({ loaded }) => {
            uploadedBytesByFile[i] = loaded;
            const done = uploadedBytesByFile.reduce((a, b) => a + b, 0);
            setProgress(totalBytes ? done / totalBytes : 0);
          },
        });
      }

      const meta = new Blob(
        [
          JSON.stringify({
            name: name.trim(),
            submittedAt: new Date().toISOString(),
            fileCount: selected.length,
          }),
        ],
        { type: "application/json" }
      );
      await upload(`submissions/${id}/_meta.json`, meta, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ submissionId: id }),
      });

      setSubmissionId(id);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err?.message || "Something went wrong during upload.");
    }
  }

  function resetForm() {
    setName("");
    setSelected([]);
    setStatus("idle");
    setErrorMessage("");
    setProgress(0);
    setSubmissionId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  }

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <header style={styles.header}>
          <p style={styles.kicker}>Full-Stack DeCal</p>
          <h1 style={styles.title}>Showcase submissions</h1>
          <p style={styles.subtitle}>
            Upload the project you built. Instructors will review it on the responses page.
          </p>
        </header>

        {status === "done" ? (
          <div style={styles.card}>
            <p style={styles.doneTitle}>Submitted.</p>
            <p style={styles.doneBody}>
              {selected.length} file{selected.length === 1 ? "" : "s"} uploaded under{" "}
              <span style={styles.mono}>{submissionId}</span>. Your instructor can now see it on
              the responses page.
            </p>
            <button type="button" onClick={resetForm} style={styles.secondaryButton}>
              Submit another project
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.card}>
            <label style={styles.label} htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              style={styles.textInput}
              disabled={status === "uploading"}
            />

            <div style={styles.modeRow}>
              <button
                type="button"
                onClick={() => switchMode("files")}
                style={mode === "files" ? styles.modeButtonActive : styles.modeButton}
                disabled={status === "uploading"}
              >
                One or more files
              </button>
              <button
                type="button"
                onClick={() => switchMode("folder")}
                style={mode === "folder" ? styles.modeButtonActive : styles.modeButton}
                disabled={status === "uploading"}
              >
                A whole project folder
              </button>
            </div>

            {mode === "files" ? (
              <input
                key="files"
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handlePick}
                style={styles.fileInput}
                disabled={status === "uploading"}
              />
            ) : (
              <input
                key="folder"
                ref={folderInputRef}
                type="file"
                // eslint-disable-next-line react/no-unknown-property
                webkitdirectory=""
                directory=""
                multiple
                onChange={handlePick}
                style={styles.fileInput}
                disabled={status === "uploading"}
              />
            )}

            {selected.length > 0 && (
              <ul style={styles.fileList}>
                {selected.slice(0, 8).map((f, i) => (
                  <li key={i} style={styles.fileItem}>
                    <span style={styles.mono}>{relativePath(f)}</span>
                    <span style={styles.fileSize}>{formatBytes(f.size)}</span>
                  </li>
                ))}
                {selected.length > 8 && (
                  <li style={styles.fileItemMore}>and {selected.length - 8} more</li>
                )}
              </ul>
            )}

            {errorMessage && <p style={styles.error}>{errorMessage}</p>}

            {status === "uploading" && (
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}

            <button type="submit" style={styles.primaryButton} disabled={status === "uploading"}>
              {status === "uploading" ? `Uploading… ${Math.round(progress * 100)}%` : "Upload"}
            </button>
          </form>
        )}

        <footer style={styles.footer}>
          <a href="/admin" style={styles.footerLink}>
            Instructor responses →
          </a>
        </footer>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: "64px 24px",
  },
  wrap: {
    width: "100%",
    maxWidth: 520,
  },
  header: {
    marginBottom: 32,
  },
  kicker: {
    margin: 0,
    fontFamily: "var(--mono)",
    fontSize: 13,
    color: "var(--ink-soft)",
    letterSpacing: "0.02em",
  },
  title: {
    margin: "6px 0 10px",
    fontSize: 34,
    fontWeight: 600,
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: 0,
    color: "var(--ink-soft)",
    fontSize: 15.5,
    maxWidth: 440,
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--ink-soft)",
  },
  textInput: {
    font: "inherit",
    fontSize: 15,
    padding: "10px 12px",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    background: "var(--bg)",
    color: "var(--ink)",
  },
  modeRow: {
    display: "flex",
    gap: 8,
    marginTop: 6,
  },
  modeButton: {
    flex: 1,
    padding: "9px 10px",
    fontSize: 13.5,
    fontWeight: 500,
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    background: "var(--bg)",
    color: "var(--ink-soft)",
    cursor: "pointer",
  },
  modeButtonActive: {
    flex: 1,
    padding: "9px 10px",
    fontSize: 13.5,
    fontWeight: 600,
    border: "1px solid var(--ink)",
    borderRadius: "var(--radius)",
    background: "var(--ink)",
    color: "var(--surface)",
    cursor: "pointer",
  },
  fileInput: {
    font: "inherit",
    fontSize: 13.5,
    color: "var(--ink-soft)",
  },
  fileList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    border: "1px solid var(--line-soft)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  fileItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "7px 10px",
    fontSize: 12.5,
    borderBottom: "1px solid var(--line-soft)",
  },
  fileItemMore: {
    padding: "7px 10px",
    fontSize: 12.5,
    color: "var(--ink-soft)",
  },
  fileSize: {
    color: "var(--ink-soft)",
    fontFamily: "var(--mono)",
    fontSize: 11.5,
    whiteSpace: "nowrap",
  },
  mono: {
    fontFamily: "var(--mono)",
  },
  error: {
    margin: 0,
    color: "var(--error)",
    fontSize: 13.5,
  },
  progressTrack: {
    height: 6,
    background: "var(--line-soft)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "var(--accent)",
    transition: "width 120ms linear",
  },
  primaryButton: {
    marginTop: 6,
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 600,
    border: "none",
    borderRadius: "var(--radius)",
    background: "var(--accent)",
    color: "var(--accent-ink)",
    cursor: "pointer",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    padding: "9px 14px",
    fontSize: 13.5,
    fontWeight: 600,
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    background: "var(--bg)",
    color: "var(--ink)",
    cursor: "pointer",
  },
  doneTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: "var(--ok)",
  },
  doneBody: {
    margin: 0,
    color: "var(--ink-soft)",
    fontSize: 14.5,
    lineHeight: 1.6,
  },
  footer: {
    marginTop: 28,
    textAlign: "center",
  },
  footerLink: {
    fontSize: 13,
    color: "var(--ink-soft)",
    textDecoration: "none",
  },
};
