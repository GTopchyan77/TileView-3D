"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/i18n";

export function DocumentLanguageSync() {
  const { language, t } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t("appTitle");

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    description?.setAttribute("content", t("appSubtitle"));
  }, [language, t]);

  return null;
}
