import { Link } from "react-router-dom";
import { t } from "../i18n";

export default function PublicBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`public-brand-lockup${compact ? " compact" : ""}`} to="/" aria-label={t("public.brand.home")}>
      <svg className="public-brand-mark" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M77 18C57 9 34 13 21 29C8 46 12 70 29 82C43 92 62 91 77 81" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <path d="M33 70C34 51 47 37 66 31C63 50 51 66 33 70Z" fill="currentColor" />
        <path d="M36 67C43 57 51 49 61 42" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className="public-brand-copy">
          <strong>ASCLEPIOS</strong>
          <span>HEALTH</span>
        </span>
      )}
    </Link>
  );
}
