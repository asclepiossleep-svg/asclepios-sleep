import { Link, NavLink } from "react-router-dom";
import PublicBrand from "./PublicBrand";

export default function PublicHeader() {
  return (
    <header className="public-header">
      <PublicBrand />
      <nav className="public-nav" aria-label="Primary navigation">
        <NavLink to="/products">Products</NavLink>
        <Link to="/member">Sleep App</Link>
        <NavLink to="/education">Education</NavLink>
        <NavLink to="/education#research">Research</NavLink>
        <NavLink to="/about">About</NavLink>
      </nav>
      <div className="public-tools" aria-label="Site tools">
        <Link to="/products" aria-label="Search products" title="Search">⌕</Link>
        <Link to="/products" aria-label="Shopping bag" title="Bag">▢</Link>
        <button className="public-menu-button" type="button" aria-label="Menu">☰</button>
      </div>
    </header>
  );
}
