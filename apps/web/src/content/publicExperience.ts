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

/**
 * Owner-approved rule:
 * These cards are functional content modules, not baked-in screenshots.
 * Each module owns its route, copy, visual treatment and optional image.
 * Product / course / app visuals can therefore be swapped independently
 * as real photography, packaging and campaigns are approved.
 */
export const homeModules: PublicVisualModule[] = [
  {
    id: "products",
    title: "Products",
    copy: "Thoughtfully selected sleep and wellbeing products.",
    to: "/products",
    cta: "Explore products",
    visualClass: "visual-products",
  },
  {
    id: "sleep-app",
    title: "Sleep App",
    copy: "Member sleep tools and guidance in one place.",
    to: "/member",
    cta: "Enter Sleep App",
    visualClass: "visual-sleep-app",
  },
  {
    id: "learning",
    title: "Learning & Courses",
    copy: "Sleep and wellbeing learning resources.",
    to: "/education",
    cta: "Start learning",
    visualClass: "visual-learning",
  },
];

export const productModules: ProductVisualModule[] = [
  {
    id: "sleep-support",
    category: "SLEEP",
    title: "Sleep Support",
    copy: "A preview of future sleep-related product information.",
    visualClass: "visual-product-sleep",
  },
  {
    id: "calm-body",
    category: "CALM",
    title: "Calm & Body",
    copy: "A preview of future wellbeing product information.",
    visualClass: "visual-product-calm",
  },
  {
    id: "gut-mood",
    category: "GUT & MOOD",
    title: "Gut & Mood",
    copy: "A preview of future gut and mood product information.",
    visualClass: "visual-product-gut",
  },
];
