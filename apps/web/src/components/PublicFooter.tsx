import { t } from "../i18n";

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <strong>ASCLĒPIOS HEALTH</strong>
      <span>{t("public.footer.tagline")}</span>
    </footer>
  );
}
