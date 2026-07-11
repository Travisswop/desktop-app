"use client";

import { Download, FileText, Lock } from "lucide-react";

type StoredFile = {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  gated?: boolean;
};

export default function FilesCard({
  config,
  mode = "public",
}: {
  config: { title?: string; files?: StoredFile[] };
  mode?: "public" | "builder";
}) {
  const files = config.files || [];
  return (
    <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-gray-950">{config.title || "Downloads"}</h3>
      <div className="mt-4 flex flex-col gap-2">
        {files.length ? files.map((file) => (
          <a
            key={file.id}
            href={file.gated || mode === "builder" ? undefined : file.url}
            download={!file.gated}
            target={!file.gated && mode === "public" ? "_blank" : undefined}
            rel="noreferrer"
            className={`flex min-h-16 items-center gap-3 overflow-hidden rounded-2xl bg-gray-50 p-3 ${file.gated ? "cursor-not-allowed opacity-55 blur-[.25px]" : "hover:bg-gray-100"}`}
            onClick={(event) => (file.gated || mode === "builder") && event.preventDefault()}
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white">{file.gated ? <Lock size={17} /> : <FileText size={17} />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-gray-900">{file.name}</span><span className="block text-[11px] text-gray-500">{file.gated ? "Token gated" : sizeLabel(file.size)}</span></span>
            {file.gated ? <Lock size={17} className="text-gray-400" /> : <Download size={17} />}
          </a>
        )) : <p className="text-sm text-gray-500">Add files for visitors to download.</p>}
      </div>
    </section>
  );
}

function sizeLabel(size?: number) {
  if (!size) return "Public file";
  return size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}
