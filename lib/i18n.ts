"use client";

import { useSyncExternalStore } from "react";

export type LanguageCode = "en" | "hy" | "ru";

export const LANGUAGE_STORAGE_KEY = "tileview-3d-language";
export const LANGUAGE_CHANGED_EVENT = "tileview-3d-language-changed";

export const languages: Array<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "EN" },
  { code: "hy", label: "HY" },
  { code: "ru", label: "RU" },
];

type TranslationKey =
  | "title"
  | "subtitle"
  | "chooseRoom"
  | "chooseSurface"
  | "floor"
  | "leftWall"
  | "rightWall"
  | "backWall"
  | "allWalls"
  | "tileCatalog"
  | "addObjects"
  | "automaticRoomObjects"
  | "selectedObject"
  | "exportPreviewImage"
  | "requestQuote"
  | "saveScene"
  | "loadSavedScene"
  | "resetSavedScene"
  | "advanced"
  | "bathroom"
  | "kitchen"
  | "livingRoom"
  | "bedroom"
  | "emptyRoom";

const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en: {
    title: "3D Tile Room Visualizer",
    subtitle: "Preview floor and wall tiles in staged 3D rooms.",
    chooseRoom: "Choose room",
    chooseSurface: "Choose surface",
    floor: "Floor",
    leftWall: "Left Wall",
    rightWall: "Right Wall",
    backWall: "Back Wall",
    allWalls: "All Walls",
    tileCatalog: "Tile catalog",
    addObjects: "Add objects",
    automaticRoomObjects: "Automatic room objects",
    selectedObject: "Selected object",
    exportPreviewImage: "Export Preview Image",
    requestQuote: "Request Quote",
    saveScene: "Save Scene",
    loadSavedScene: "Load Saved Scene",
    resetSavedScene: "Reset Saved Scene",
    advanced: "Advanced",
    bathroom: "Bathroom",
    kitchen: "Kitchen",
    livingRoom: "Living Room",
    bedroom: "Bedroom",
    emptyRoom: "Empty Room",
  },
  hy: {
    title: "3D սալիկների սենյակի վիզուալիզատոր",
    subtitle: "Դիտեք հատակի և պատի սալիկները բեմադրված 3D սենյակներում։",
    chooseRoom: "Ընտրել սենյակ",
    chooseSurface: "Ընտրել մակերես",
    floor: "Հատակ",
    leftWall: "Ձախ պատ",
    rightWall: "Աջ պատ",
    backWall: "Հետին պատ",
    allWalls: "Բոլոր պատերը",
    tileCatalog: "Սալիկների կատալոգ",
    addObjects: "Ավելացնել առարկաներ",
    automaticRoomObjects: "Սենյակի ավտոմատ առարկաներ",
    selectedObject: "Ընտրված առարկա",
    exportPreviewImage: "Արտահանել նախադիտումը",
    requestQuote: "Գնի հարցում",
    saveScene: "Պահել տեսարանը",
    loadSavedScene: "Բեռնել պահված տեսարանը",
    resetSavedScene: "Մաքրել պահված տեսարանը",
    advanced: "Ընդլայնված",
    bathroom: "Լոգասենյակ",
    kitchen: "Խոհանոց",
    livingRoom: "Հյուրասենյակ",
    bedroom: "Ննջասենյակ",
    emptyRoom: "Դատարկ սենյակ",
  },
  ru: {
    title: "3D визуализатор плитки",
    subtitle: "Просматривайте напольную и настенную плитку в 3D комнатах.",
    chooseRoom: "Выбрать комнату",
    chooseSurface: "Выбрать поверхность",
    floor: "Пол",
    leftWall: "Левая стена",
    rightWall: "Правая стена",
    backWall: "Задняя стена",
    allWalls: "Все стены",
    tileCatalog: "Каталог плитки",
    addObjects: "Добавить объекты",
    automaticRoomObjects: "Автоматические объекты комнаты",
    selectedObject: "Выбранный объект",
    exportPreviewImage: "Экспорт изображения",
    requestQuote: "Запросить расчет",
    saveScene: "Сохранить сцену",
    loadSavedScene: "Загрузить сцену",
    resetSavedScene: "Сбросить сцену",
    advanced: "Дополнительно",
    bathroom: "Ванная",
    kitchen: "Кухня",
    livingRoom: "Гостиная",
    bedroom: "Спальня",
    emptyRoom: "Пустая комната",
  },
};

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === "en" || value === "hy" || value === "ru";
}

function readStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") {
    return "en";
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguageCode(storedLanguage) ? storedLanguage : "en";
}

export function setStoredLanguage(language: LanguageCode) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: language }));
}

function subscribeToLanguageChanges(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LANGUAGE_CHANGED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANGUAGE_CHANGED_EVENT, callback);
  };
}

export function useLanguage() {
  const language = useSyncExternalStore<LanguageCode>(
    subscribeToLanguageChanges,
    readStoredLanguage,
    () => "en",
  );

  const changeLanguage = (nextLanguage: LanguageCode) => {
    setStoredLanguage(nextLanguage);
  };

  const t = (key: TranslationKey) => translations[language][key] ?? translations.en[key];

  return { language, setLanguage: changeLanguage, t };
}

export function translateRoomLabel(roomId: string, translate: (key: TranslationKey) => string) {
  if (roomId === "bathroom") {
    return translate("bathroom");
  }

  if (roomId === "kitchen") {
    return translate("kitchen");
  }

  if (roomId === "living-room") {
    return translate("livingRoom");
  }

  if (roomId === "bedroom") {
    return translate("bedroom");
  }

  if (roomId === "empty-room") {
    return translate("emptyRoom");
  }

  return roomId;
}
