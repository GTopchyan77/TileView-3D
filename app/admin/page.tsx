"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { useTiles } from "@/hooks/use-tiles";
import { useLanguage } from "@/lib/i18n";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  notifyCloudTilesChanged,
  SUPABASE_TILE_BUCKET,
} from "@/lib/supabase/client";
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
  errorLabel,
}: {
  src: string;
  alt: string;
  className?: string;
  errorLabel: string;
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
  const { t } = useLanguage();
  const {
    defaultTiles,
    customTiles,
    cloudTiles,
    cloudConfigured,
    addTile,
    deleteCustomTile,
    resetCustomTiles,
  } = useTiles();
  const [form, setForm] = useState(defaultForm);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [cloudMessage, setCloudMessage] = useState<string>(
    isSupabaseConfigured() ? "" : t("cloudNotConfigured"),
  );
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);

  const previewImage = uploadedImageDataUrl || form.imageUrl;

  const buildTileDraft = () => {
    const name = form.name.trim();
    const imageUrl = form.imageUrl.trim();
    const image = uploadedImageDataUrl || imageUrl;
    const widthCm = Number(form.widthCm);
    const heightCm = Number(form.heightCm);

    if (!name) {
      throw new Error(t("tileNameRequired"));
    }

    if (!image) {
      throw new Error(t("imageRequired"));
    }

    if (!Number.isFinite(widthCm) || widthCm <= 0 || !Number.isFinite(heightCm) || heightCm <= 0) {
      throw new Error(t("positiveDimensionsRequired"));
    }

    return {
      name,
      image,
      widthCm,
      heightCm,
      finish: form.finish.trim(),
      tone: form.tone.trim(),
    };
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setUploadedImageDataUrl("");
      setUploadedFileName("");
      setUploadedFile(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage(t("invalidImageType"));
      setUploadedImageDataUrl("");
      setUploadedFileName("");
      setUploadedFile(null);
      event.target.value = "";
      setFileInputKey((current) => current + 1);
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setErrorMessage(t("imageTooLarge"));
      setUploadedImageDataUrl("");
      setUploadedFileName("");
      setUploadedFile(null);
      event.target.value = "";
      setFileInputKey((current) => current + 1);
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";

        if (!result) {
          setErrorMessage(t("imagePreviewFailed"));
          setUploadedImageDataUrl("");
          setUploadedFileName("");
          return;
        }

        setUploadedImageDataUrl(result);
        setUploadedFileName(file.name);
        setUploadedFile(file);
        setErrorMessage("");
      };
      reader.onerror = () => {
        setErrorMessage(t("imageReadFailed"));
        setUploadedImageDataUrl("");
        setUploadedFileName("");
        setUploadedFile(null);
      };
      reader.readAsDataURL(file);
    } catch {
      setErrorMessage(t("imageProcessFailed"));
      setUploadedImageDataUrl("");
      setUploadedFileName("");
      setUploadedFile(null);
      event.target.value = "";
      setFileInputKey((current) => current + 1);
    }
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const draft = buildTileDraft();

      const tile: Tile = {
        id: `${draft.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        name: draft.name,
        image: draft.image,
        widthCm: draft.widthCm,
        heightCm: draft.heightCm,
        finish: draft.finish,
        tone: draft.tone,
      };

      addTile(tile);
      setErrorMessage("");
      setCloudMessage(cloudConfigured ? cloudMessage : t("cloudNotConfigured"));
      setForm(defaultForm);
      setUploadedImageDataUrl("");
      setUploadedFileName("");
      setUploadedFile(null);
      setFileInputKey((current) => current + 1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("tileImportFailed"));
    }
  };

  const saveTileToCloud = async () => {
    if (!cloudConfigured) {
      setCloudMessage(t("cloudNotConfigured"));
      return;
    }

    setIsSavingToCloud(true);
    setErrorMessage("");

    try {
      const client = getSupabaseBrowserClient();

      if (!client) {
        throw new Error(t("cloudNotConfigured"));
      }

      const draft = buildTileDraft();
      let imageUrl = form.imageUrl.trim();

      if (uploadedFile) {
        const extension = uploadedFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const storagePath = `tiles/${Date.now()}-${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${extension}`;
        const { error: uploadError } = await client.storage
          .from(SUPABASE_TILE_BUCKET)
          .upload(storagePath, uploadedFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: uploadedFile.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = client.storage
          .from(SUPABASE_TILE_BUCKET)
          .getPublicUrl(storagePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const { error: insertError } = await client.from("tiles").insert({
        name: draft.name,
        image_url: imageUrl || draft.image,
        width_cm: draft.widthCm,
        height_cm: draft.heightCm,
        finish: draft.finish || null,
        tone: draft.tone || null,
      });

      if (insertError) {
        throw insertError;
      }

      notifyCloudTilesChanged();
      setCloudMessage(t("savedToCloud"));
    } catch (error) {
      setCloudMessage(error instanceof Error ? error.message : t("cloudSaveFailed"));
    } finally {
      setIsSavingToCloud(false);
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
              <p className="section-kicker">{t("adminMock")}</p>
              <h1 className="display-title mt-4 text-4xl font-semibold text-white md:text-5xl">
                {t("adminTitle")}
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-200 md:text-base">
                {t("adminIntro")}
              </p>
              {cloudMessage ? (
                <p className="mt-3 text-sm text-sky-200">{cloudMessage}</p>
              ) : null}
            </div>
            <div className="glass-chip rounded-[24px] px-5 py-4 text-sm text-slate-300">
              <p className="font-semibold text-slate-50">
                {t("availableTilesCount", { count: defaultTiles.length + customTiles.length + cloudTiles.length })}
              </p>
              <p className="mt-1">{t("adminTilesAvailableHelp")}</p>
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <form onSubmit={submitForm} className="panel rounded-[30px] p-5">
            <p className="section-kicker">{t("importTile")}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-50">{t("createLocalEntry")}</p>
              <p className="mt-2 text-sm text-slate-300">
              {t("importLocalHelp")}
            </p>
            <p className="mt-2 text-sm text-sky-200">
              {t("uploadDemoHelp")}
            </p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">{t("name")}</span>
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
                <span className="mb-2 block text-sm font-medium text-slate-200">{t("uploadImage")}</span>
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-900"
                />
                <span className="mt-2 block text-xs text-slate-300/80">
                  {t("imageUploadHelp")}
                </span>
                {uploadedFileName ? (
                  <span className="mt-2 block text-xs font-medium text-sky-200">
                    {t("selectedFile", { fileName: uploadedFileName })}
                  </span>
                ) : null}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">{t("imageUrlFallback")}</span>
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
                  {t("imageUrlFallbackHelp")}
                </span>
              </label>
              <div className="glass-chip rounded-[22px] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{t("previewThumbnail")}</p>
                <TileThumbnail
                  src={previewImage}
                  alt={t("importedTilePreview")}
                  errorLabel={t("imagePreviewFailed")}
                  className="mt-3 h-28 w-full rounded-[18px] border border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">{t("widthCm")}</span>
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
                  <span className="mb-2 block text-sm font-medium text-slate-200">{t("heightCm")}</span>
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
                <span className="mb-2 block text-sm font-medium text-slate-200">{t("finish")}</span>
                <input
                  value={form.finish}
                  onChange={(event) => setForm((current) => ({ ...current, finish: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">{t("tone")}</span>
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
            <div className="mt-5 grid gap-3">
              <button type="submit" className="primary-btn w-full px-5 py-3 text-sm">
                {t("importTile")}
              </button>
              <button
                type="button"
                onClick={() => void saveTileToCloud()}
                disabled={isSavingToCloud}
                className="secondary-btn w-full px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingToCloud ? t("saving") : t("saveToCloud")}
              </button>
            </div>
          </form>

          <div className="grid gap-6">
            <section className="panel rounded-[30px] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="section-kicker">{t("customTiles")}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-50">{t("importedDemoEntries")}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {t("customTilesHelp")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
                    {t("customCount", { count: customTiles.length })}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-medium text-slate-200">
                    {t("cloudCount", { count: cloudTiles.length })}
                  </span>
                  <button
                    type="button"
                    onClick={resetCustomTiles}
                    className="secondary-btn px-4 py-2 text-xs font-semibold"
                  >
                    {t("resetDemoData")}
                  </button>
                </div>
              </div>

              {customTiles.length === 0 ? (
                <div className="mt-5 rounded-[26px] border border-dashed border-white/10 bg-white/4 p-8 text-center">
                  <p className="text-lg font-semibold text-slate-50">{t("noCustomTiles")}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {t("noCustomTilesHelp")}
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {customTiles.map((tile) => (
                    <div key={tile.id} className="panel panel-hover group rounded-[28px] p-4">
                      <TileThumbnail
                        src={tile.image}
                        alt={tile.name}
                        errorLabel={t("imageUnavailable")}
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
                          {t("delete")}
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="glass-chip rounded-full px-3 py-1">{tile.finish || t("finish")}</span>
                        <span className="glass-chip rounded-full px-3 py-1">{tile.tone || t("tone")}</span>
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
                  <p className="section-kicker">{t("defaultDemoTiles")}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-50">{t("bundledReadOnlyTiles")}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {t("defaultTilesHelp")}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-medium text-slate-200">
                  {t("defaultCount", { count: defaultTiles.length })}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {defaultTiles.map((tile) => (
                  <div key={tile.id} className="panel panel-hover group rounded-[28px] p-4">
                    <TileThumbnail
                      src={tile.image}
                      alt={tile.name}
                      errorLabel={t("imageUnavailable")}
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
                        {t("readOnly")}
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
