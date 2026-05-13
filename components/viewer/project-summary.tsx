"use client";

type ProjectSummaryProps = {
  title: string;
  roomLabel: string;
  activeSurfaceLabel: string;
  floorLabel: string;
  leftWallLabel: string;
  rightWallLabel: string;
  backWallLabel: string;
  floorMaterial: string;
  leftWallMaterial: string;
  rightWallMaterial: string;
  backWallMaterial: string;
  visibleObjectsLabel: string;
  visibleObjects: string[];
  objectCountLabel: string;
  materialCategoriesLabel: string;
  materialCategories: string[];
  noneLabel: string;
};

function SummaryItem({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-[16px] border border-white/8 bg-white/[0.04] ${compact ? "px-3 py-2.5" : "px-3.5 py-3"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

export function ProjectSummary({
  title,
  roomLabel,
  activeSurfaceLabel,
  floorLabel,
  leftWallLabel,
  rightWallLabel,
  backWallLabel,
  floorMaterial,
  leftWallMaterial,
  rightWallMaterial,
  backWallMaterial,
  visibleObjectsLabel,
  visibleObjects,
  objectCountLabel,
  materialCategoriesLabel,
  materialCategories,
  noneLabel,
}: ProjectSummaryProps) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-white/[0.045] px-3.5 py-3 md:px-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-kicker">{title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-slate-200">
                {roomLabel}
              </span>
              <span className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-slate-200">
                {activeSurfaceLabel}
              </span>
              <span className="rounded-full bg-sky-400/12 px-3 py-1.5 text-xs font-semibold text-sky-100">
                {objectCountLabel}
              </span>
            </div>
          </div>

          <div className="max-w-[420px] rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {materialCategoriesLabel}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(materialCategories.length ? materialCategories : [noneLabel]).map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-white/8 bg-slate-950/40 px-2.5 py-1 text-xs text-slate-200"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <SummaryItem label={floorLabel} value={floorMaterial} compact />
          <SummaryItem label={leftWallLabel} value={leftWallMaterial} compact />
          <SummaryItem label={rightWallLabel} value={rightWallMaterial} compact />
          <SummaryItem label={backWallLabel} value={backWallMaterial} compact />
          <div className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {visibleObjectsLabel}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-100">
              {visibleObjects.length ? visibleObjects.join(", ") : noneLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
