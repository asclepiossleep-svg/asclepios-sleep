import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Sleep from "./pages/Sleep";
import Learn from "./pages/Learn";
import { useLocale } from "./i18n/useLocale";

export default function App() {
  // t() reads a module-level locale, not React state, so the tree needs a
  // remount (via key) to re-render every t() call site after a language
  // switch — see i18n/index.ts's setLocale/subscribeLocale.
  const locale = useLocale();
  return (
    <Routes key={locale}>
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      <Route path="/sleep" element={<Sleep />} />
      <Route path="/learn" element={<Learn />} />
    </Routes>
  );
}
