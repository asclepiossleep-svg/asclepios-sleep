import { t } from "../i18n";

export type PublicVisualModule = {
  id: string;
  title: string;
  copy: string;
  to: string;
  cta: string;
  visualClass: string;
  imageSrc?: string;
  imageAlt?: string;
};

export type ProductVisualModule = {
  id: string;
  category: string;
  title: string;
  copy: string;
  visualClass: string;
  imageSrc?: string;
  imageAlt?: string;
};

export function getHomeModules(): PublicVisualModule[] {
  return [
    {
      id: "products",
      title: t("public.home.products.title"),
      copy: t("public.home.products.copy"),
      to: "/products",
      cta: t("public.home.products.cta"),
      visualClass: "visual-products",
    },
    {
      id: "sleep-app",
      title: t("public.home.app.title"),
      copy: t("public.home.app.copy"),
      to: "/member",
      cta: t("public.home.app.cta"),
      visualClass: "visual-sleep-app",
    },
    {
      id: "learning",
      title: t("public.home.learning.title"),
      copy: t("public.home.learning.copy"),
      to: "/education",
      cta: t("public.home.learning.cta"),
      visualClass: "visual-learning",
    },
  ];
}

export function getProductModules(): ProductVisualModule[] {
  return [
    {
      id: "sleep-support",
      category: t("public.products.sleep.category"),
      title: t("public.products.sleep.title"),
      copy: t("public.products.sleep.copy"),
      visualClass: "visual-product-sleep",
    },
    {
      id: "calm-body",
      category: t("public.products.calm.category"),
      title: t("public.products.calm.title"),
      copy: t("public.products.calm.copy"),
      visualClass: "visual-product-calm",
    },
    {
      id: "gut-mood",
      category: t("public.products.gut.category"),
      title: t("public.products.gut.title"),
      copy: t("public.products.gut.copy"),
      visualClass: "visual-product-gut",
    },
  ];
}
