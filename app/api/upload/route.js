import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";

// This route never sees file bytes -- it only hands out short-lived
// upload tokens so the browser can send files straight to Vercel Blob.
// That's what lets folder uploads with many/large files skip the ~4.5MB
// serverless request-body limit.
export async function POST(request) {
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Anyone with the link can submit a project -- this is a public
        // course showcase, not an authenticated app. We only constrain
        // *where* files can land and how big they can be.
        if (!pathname.startsWith("submissions/")) {
          throw new Error("Uploads must live under submissions/.");
        }
        return {
          allowedContentTypes: undefined, // accept whatever the project contains
          addRandomSuffix: false,
          allowOverwrite: true,
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB per file
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Nothing to do -- the admin page lists blobs by prefix directly,
        // so there's no separate database row to keep in sync.
        console.log("uploaded:", blob.pathname);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
