"use client";
import { useState, useRef, useCallback, useEffect } from "react";

interface ImageUploaderProps {
  preview: string | null;
  onFileSelect: (file: File) => void;
  onUrlSelect: (url: string) => void;
  onClear: () => void;
  uploading?: boolean;
}

type Tab = "upload" | "url";

export function ImageUploader({ preview, onFileSelect, onUrlSelect, onClear, uploading }: ImageUploaderProps) {
  const [tab, setTab] = useState<Tab>("upload");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── Paste handler ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { onFileSelect(file); return; }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onFileSelect]);

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) onFileSelect(file);
  }, [onFileSelect]);

  // ── URL fetch ──────────────────────────────────────────────────────────────
  const handleUrlFetch = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setUrlError("");
    try {
      const url = urlInput.trim();
      // Validate URL
      new URL(url);
      // Try to load it as an image to verify
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not load image from URL"));
        img.src = url;
        setTimeout(() => reject(new Error("Timeout")), 8000);
      });
      onUrlSelect(url);
      setUrlInput("");
    } catch {
      setUrlError("Could not load image from this URL. Try uploading instead.");
    } finally {
      setUrlLoading(false);
    }
  };

  // ── If preview exists show it ──────────────────────────────────────────────
  if (preview) {
    return (
      <div className="relative h-36 w-full overflow-hidden rounded-xl border border-zinc-700">
        <img src={preview} alt="Preview" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="absolute bottom-2 left-2">
          <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs text-zinc-300 backdrop-blur-sm">
            {uploading ? "Uploading..." : "Ready"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === "upload" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Upload / Paste / Drop
        </button>
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === "url" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Image URL
        </button>
      </div>

      {tab === "upload" && (
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onFocus={() => setPasteHint(true)}
          onBlur={() => setPasteHint(false)}
          tabIndex={0}
          className={`relative flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all outline-none
            ${isDragging
              ? "border-emerald-400 bg-emerald-500/10 scale-[1.02]"
              : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-600 hover:bg-zinc-800/60 focus:border-emerald-500/50"
            }`}
        >
          {isDragging ? (
            <>
              <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm font-medium text-emerald-400">Drop to add image</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-zinc-400">
                  <span className="text-white font-medium">Click to upload</span>
                  {" "}&middot;{" "}
                  <span className="text-zinc-400">Drag & Drop</span>
                </p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  or{" "}
                  <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                    Ctrl+V
                  </kbd>
                  {" "}to paste from clipboard
                </p>
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
            }}
          />
        </div>
      )}

      {tab === "url" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUrlFetch(); } }}
              placeholder="https://example.com/banner.jpg"
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              autoFocus
            />
            <button
              type="button"
              onClick={handleUrlFetch}
              disabled={urlLoading || !urlInput.trim()}
              className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {urlLoading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : "Load"}
            </button>
          </div>
          {urlError && <p className="text-xs text-red-400">{urlError}</p>}
          <p className="text-xs text-zinc-600">Paste a direct image URL from any website or CDN</p>
        </div>
      )}
    </div>
  );
}