import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      "SYSTEM_TITLE": "LAB MANAGEMENT SYSTEM",
      "MENU_MAIN": "SYSTEM MENU",
      "NAV_PERMISSION": "Permission Maintenance",
      "NAV_CONFIG": "Configuration Maintenance",
      "NAV_PROD_FAMILY": "Product Family",
      "NAV_TEST_SET": "Test Settings",
      "NAV_VIEW": "Project View / Search",
      "NAV_CREATE": "Create Project",
      "NAV_CHECK": "Check In / Out",
      "LOGOUT": "Logout",
      "LOGIN": "Log in",
      "USER_ID": "User ID",
      "PASSWORD": "Password",
      "PW_HINT": "Default Password: 1234",
      "EDIT_PROJ": "Edit Project"
    }
  },
  zh: {
    translation: {
      "SYSTEM_TITLE": "實驗室管理系統",
      "MENU_MAIN": "系統選單",
      "NAV_PERMISSION": "權限維護",
      "NAV_CONFIG": "參數維護",
      "NAV_PROD_FAMILY": "產品系列",
      "NAV_TEST_SET": "測試設定",
      "NAV_VIEW": "專案檢視 / 查詢",
      "NAV_CREATE": "建立專案",
      "NAV_CHECK": "進出站管理",
      "LOGOUT": "登出",
      "LOGIN": "登錄",
      "USER_ID": "帳號",
      "PASSWORD": "密碼",
      "EDIT_PROJ": "編輯專案"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: { escapeValue: false }
  });

export default i18n;
