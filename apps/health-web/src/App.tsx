import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Learn from "./pages/Learn";
import { useLocale } from "./i18n/useLocale";
import { CartProvider } from "./state/cart";

export default function App() {
  // t() reads a module-level locale, not React state, so the tree needs a
  // remount (via key) to re-render every t() call site after a language
  // switch — see i18n/index.ts's setLocale/subscribeLocale. CartProvider
  // sits outside the keyed subtree so the demo cart survives a locale
  // switch instead of being reset by the remount.
  const locale = useLocale();
  return (
    <CartProvider>
      <Routes key={locale}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/learn" element={<Learn />} />
      </Routes>
    </CartProvider>
  );
}
