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
      </nav>
    </header>
  );
}
