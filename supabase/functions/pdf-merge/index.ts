import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { files } = await req.json() as {
      files: { url: string; copies: number }[];
    };

    if (!Array.isArray(files) || files.length === 0) {
      return new Response(JSON.stringify({ error: "files 배열이 필요합니다." }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const merged = await PDFDocument.create();

    for (const { url, copies } of files) {
      if (!url || copies < 1) continue;

      const res = await fetch(url);
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: `PDF 다운로드 실패: ${url} (${res.status})` }),
          { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
        );
      }

      const bytes = await res.arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const pageCount = src.getPageCount();

      for (let i = 0; i < copies; i++) {
        const indices = Array.from({ length: pageCount }, (_, p) => p);
        const copied = await merged.copyPages(src, indices);
        copied.forEach((page) => merged.addPage(page));
      }
    }

    const mergedBytes = await merged.save();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(mergedBytes)));

    return new Response(JSON.stringify({ pdf: base64 }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
