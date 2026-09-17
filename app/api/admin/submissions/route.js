import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

// There's no separate database: every uploaded file lives at
// submissions/<submissionId>/<relative path>, plus one
// submissions/<submissionId>/_meta.json written last by the client with
// {name, submittedAt, fileCount}. This route lists everything under
// submissions/ and groups it back into one entry per submission.
export async function GET() {
  try {
    const allBlobs = [];
    let cursor;
    do {
      const page = await list({ prefix: "submissions/", cursor, limit: 1000 });
      allBlobs.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    const bySubmission = new Map();

    for (const blob of allBlobs) {
      const rest = blob.pathname.slice("submissions/".length); // "<id>/<path...>"
      const slash = rest.indexOf("/");
      if (slash === -1) continue; // stray file directly under submissions/, ignore
      const id = rest.slice(0, slash);
      const relPath = rest.slice(slash + 1);

      if (!bySubmission.has(id)) {
        bySubmission.set(id, { id, files: [], metaBlob: null });
      }
      const entry = bySubmission.get(id);

      if (relPath === "_meta.json") {
        entry.metaBlob = blob;
      } else {
        entry.files.push({
          path: relPath,
          url: blob.url,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        });
      }
    }

    const submissions = await Promise.all(
      Array.from(bySubmission.values()).map(async (entry) => {
        let name = "Unknown";
        let submittedAt = entry.files[0]?.uploadedAt || null;

        if (entry.metaBlob) {
          try {
            const res = await fetch(entry.metaBlob.url, { cache: "no-store" });
            if (res.ok) {
              const meta = await res.json();
              if (typeof meta.name === "string" && meta.name.trim()) name = meta.name.trim();
              if (typeof meta.submittedAt === "string") submittedAt = meta.submittedAt;
            }
          } catch {
            // fall through to the defaults above
          }
        }

        entry.files.sort((a, b) => a.path.localeCompare(b.path));

        return {
          id: entry.id,
          name,
          submittedAt,
          fileCount: entry.files.length,
          files: entry.files,
        };
      })
    );

    submissions.sort((a, b) => {
      const at = a.submittedAt ? Date.parse(a.submittedAt) : 0;
      const bt = b.submittedAt ? Date.parse(b.submittedAt) : 0;
      return bt - at;
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
