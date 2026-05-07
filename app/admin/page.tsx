"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { useTiles } from "@/hooks/use-tiles";
import { Tile } from "@/types/tile";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

const defaultForm = {
  name: "",
  imageUrl: "",
  widthCm: "60",
  heightCm: "60",
  finish: "Matte",
  tone: "Custom",
};

function TileThumbnail({
  src,
  alt,
  className,
  errorLabel = "Image unavailable",
}: {
  src: string;
  alt: string;
  className?: string;
  errorLabel?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const imageSrc = hasError || !src ? "/tiles/placeholder.svg" : src;

  return (
    <div className={`soft-grid relative overflow-hidden bg-slate-900 ${className ?? ""}`}>
      <Image
        src={imageSrc}
        alt={alt}
        fill
        unoptimized
        onError={() => setHasError(true)}
        className="object-cover transition duration-300 group-hover:scale-[1.04]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/28 to-transparent" />
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-center text-xs font-medium text-slate-300">
          {errorLabel}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPage() {
  const { defaultTiles, customTiles, addTile, deleteCustomTile, resetCustomTiles } = useTiles();
  const [form, setForm] = useState(defaultForm);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const previewImage = uploadedImageDataUrl || form.imageUrl;

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setUploadedImageDataUrl("");
      setUploadedFileName("");
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage("Please upload a JPG, PNG, or WEBP image file.");
      setUploadedImageDataUrl("");
      setUploadedFileName("");
      event.target.value = "";
      setFileInputKey((current) => current + 1);
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setErrorMessage("Please upload an image under 5MB for this demo.");
      setUploadedImageDataUrl("");
      setUploadedFileName("");
      event.target.value = "";
      setFileInputKey((current) => current + 1);
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";

        if (!result) {
          setErrorMessage("Image preview failed.");
          setUploadedImageDataUrl("");
          setUploadedFileName("");
          return;
        }

        setUploadedImageDataUrl(result);
        setUploadedFileName(file.name);
        setErrorMessage("");
      };
      reader.onerror = () => {
        setErrorMessage("The selected image could not be read.");
        setUploadedImageDataUrl("");
        setUploadedFileName("");
      };
      reader.readAsDataURL(file);
    } catch {
      setErrorMessage("The selected image could not be processed.");
      setUploadedImageDataUrl("");
      setUploadedFileName("");
      event.target.value = "";
      setFileInputKey((current) => current + 1);
    }
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const name = form.name.trim();
      const imageUrl = form.imageUrl.trim();
      const image = uploadedImageDataUrl || imageUrl;
      const widthCm = Number(form.widthCm);
      const heightCm = Number(form.heightCm);

      if (!name) {
        setErrorMessage("Tile name is required.");
        return;
      }

      if (!image) {
        setErrorMessage("Either an uploaded image or an Image URL is required.");
        return;
      }

      if (!Number.isFinite(widthCm) || widthCm <= 0 || !Number.isFinite(heightCm) || heightCm <= 0) {
        setErrorMessage("Width and height must be positive numbers.");
        return;
      }

      const tile: Tile = {
        id: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        name,
        image,
        widthCm,
        heightCm,
        finish: form.finish.trim(),
        tone: form.tone.trim(),
      };

      addTile(tile);
      setErrorMessage("");
      setForm(defaultForm);
      setUploadedImageDataUrl("");
      setUploadedFileName("");
      setFileInputKey((current) => current + 1);
    } catch {
      setErrorMessage("The tile could not be imported. Please try again with a valid image.");
    }
  };

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 md:px-6">
        <SiteNav />
      </div>

      <main className="mx-auto min-h-screen max-w-[1600px] px-4 py-6 md:px-6 md:py-8">
        <div className="panel fade-in-up rounded-[36px] p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="section-kicker">Admin Mock</p>
              <h1 className="display-title mt-4 text-4xl font-semibold text-white md:text-5xl">
                Demo catalog management
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-200 md:text-base">
                This page stays local-only for demo day. Imported tiles persist in browser storage,
                bundled demo tiles remain read-only, and custom entries appear in the visualizer after refresh.
              </p>
            </div>
            <div className="glass-chip rounded-[24px] px-5 py-4 text-sm text-slate-300">
              <p className="font-semibold text-slate-50">{defaultTiles.length + customTiles.length} tiles available</p>
              <p className="mt-1">Use this page to expand the demo catalog on the fly.</p>
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <form onSubmit={submitForm} className="panel rounded-[30px] p-5">
            <p className="section-kicker">Import Tile</p>
            <p className="mt-3 text-2xl font-semibold text-slate-50">Create a local demo entry</p>
              <p className="mt-2 text-sm text-slate-300">
              Imported tiles are stored in localStorage and can be deleted later from the Custom Tiles section.
            </p>
            <p className="mt-2 text-sm text-sky-200">
              For demo, upload tile images from your computer. Production will store files on the server.
            </p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, name: event.target.value }));
                    setErrorMessage("");
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="Sahara Stone"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Upload Image</span>
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-900"
                />
                <span className="mt-2 block text-xs text-slate-300/80">
                  Choose a JPG, PNG, or WEBP tile image from your computer. Max 5MB.
                </span>
                {uploadedFileName ? (
                  <span className="mt-2 block text-xs font-medium text-sky-200">
                    Selected file: {uploadedFileName}
                  </span>
                ) : null}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Image URL (optional fallback)</span>
                <input
                  value={form.imageUrl}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, imageUrl: event.target.value }));
                    setErrorMessage("");
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="https://example.com/tile-texture.jpg"
                />
                <span className="mt-2 block text-xs text-slate-300/80">
                  Used only if you do not upload a local image.
                </span>
              </label>
              <div className="glass-chip rounded-[22px] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Preview thumbnail</p>
                <TileThumbnail
                  src={previewImage}
                  alt="Imported tile preview"
                  errorLabel="Image preview failed"
                  className="mt-3 h-28 w-full rounded-[18px] border border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Width (cm)</span>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.widthCm}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, widthCm: event.target.value }));
                      setErrorMessage("");
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Height (cm)</span>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.heightCm}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, heightCm: event.target.value }));
                      setErrorMessage("");
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Finish</span>
                <input
                  value={form.finish}
                  onChange={(event) => setForm((current) => ({ ...current, finish: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Tone</span>
                <input
                  value={form.tone}
                  onChange={(event) => setForm((current) => ({ ...current, tone: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none"
                />
              </label>
            </div>
            {errorMessage ? (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : null}
            <button type="submit" className="primary-btn mt-5 w-full px-5 py-3 text-sm">
              Import Tile
            </button>
          </form>

          <div className="grid gap-6">
            <section className="panel rounded-[30px] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="section-kicker">Custom Tiles</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-50">Imported demo entries</p>
                  <p className="mt-2 text-sm text-slate-300">
                    These are local-only tiles. They can be deleted and will stay available after refresh in this browser.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
                    {customTiles.length} custom
                  </span>
                  <button
                    type="button"
                    onClick={resetCustomTiles}
                    className="secondary-btn px-4 py-2 text-xs font-semibold"
                  >
                    Reset Demo Data
                  </button>
                </div>
              </div>

              {customTiles.length === 0 ? (
                <div className="mt-5 rounded-[26px] border border-dashed border-white/10 bg-white/4 p-8 text-center">
                  <p className="text-lg font-semibold text-slate-50">No custom tiles yet</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Use the Import Tile form to add a tile URL, dimensions, finish, and tone for the demo.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {customTiles.map((tile) => (
                    <div key={tile.id} className="panel panel-hover group rounded-[28px] p-4">
                      <TileThumbnail
                        src={tile.image}
                        alt={tile.name}
                        className="h-32 w-full rounded-[22px] border border-white/10"
                      />
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-50">{tile.name}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            {tile.widthCm}x{tile.heightCm} cm
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteCustomTile(tile.id)}
                          className="danger-btn px-3 py-1.5 text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="glass-chip rounded-full px-3 py-1">{tile.finish || "Finish"}</span>
                        <span className="glass-chip rounded-full px-3 py-1">{tile.tone || "Tone"}</span>
                      </div>
                      <p className="mt-3 truncate text-xs text-slate-300/70">{tile.image}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel rounded-[30px] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="section-kicker">Default Demo Tiles</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-50">Bundled read-only tiles</p>
                  <p className="mt-2 text-sm text-slate-300">
                    These demo tiles come from the local JSON catalog and cannot be deleted from the admin page.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-medium text-slate-200">
                  {defaultTiles.length} default
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {defaultTiles.map((tile) => (
                  <div key={tile.id} className="panel panel-hover group rounded-[28px] p-4">
                    <TileThumbnail
                      src={tile.image}
                      alt={tile.name}
                      className="h-32 w-full rounded-[22px] border border-white/10"
                    />
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-50">{tile.name}</p>
                          <p className="mt-1 text-sm text-slate-300">
                          {tile.widthCm}x{tile.heightCm} cm
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-slate-300">
                        Read-only
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="glass-chip rounded-full px-3 py-1">{tile.finish}</span>
                      <span className="glass-chip rounded-full px-3 py-1">{tile.tone}</span>
                    </div>
                      <p className="mt-3 truncate text-xs text-slate-300/70">{tile.image}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
