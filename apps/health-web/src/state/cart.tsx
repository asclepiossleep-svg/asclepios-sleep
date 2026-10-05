import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { HEALTH_PRODUCTS } from "../data/products";

export interface CartLine {
  slug: string;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  totalQuantity: number;
  addItem: (slug: string, quantity?: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  removeItem: (slug: string) => void;
  clear: () => void;
}

const STORAGE_KEY = "health.demoCart.v1";
const MAX_LINE_QUANTITY = 9;
const KNOWN_SLUGS = new Set(HEALTH_PRODUCTS.map((product) => product.slug));

/**
 * sessionStorage, not localStorage: the manager instruction requires an
 * honestly local/session-only DEMO cart with no persistence beyond the
 * browser tab's lifetime (no order, payment or database writes anywhere).
 */
function readStoredLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line): line is CartLine =>
        line &&
        typeof line.slug === "string" &&
        KNOWN_SLUGS.has(line.slug) &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0
    );
  } catch {
    return [];
  }
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => readStoredLines());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
      addItem: (slug, quantity = 1) => {
        if (!KNOWN_SLUGS.has(slug)) return;
        setLines((current) => {
          const existing = current.find((line) => line.slug === slug);
          if (!existing) return [...current, { slug, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }];
          return current.map((line) =>
            line.slug === slug
              ? { ...line, quantity: Math.min(line.quantity + quantity, MAX_LINE_QUANTITY) }
              : line
          );
        });
      },
      setQuantity: (slug, quantity) => {
        setLines((current) => {
          if (quantity <= 0) return current.filter((line) => line.slug !== slug);
          const bounded = Math.min(quantity, MAX_LINE_QUANTITY);
          return current.map((line) => (line.slug === slug ? { ...line, quantity: bounded } : line));
        });
      },
      removeItem: (slug) => {
        setLines((current) => current.filter((line) => line.slug !== slug));
      },
      clear: () => setLines([]),
    }),
    [lines]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}

export const CART_MAX_LINE_QUANTITY = MAX_LINE_QUANTITY;
