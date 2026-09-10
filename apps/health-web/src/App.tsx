const SLEEP_APP_URL = import.meta.env.VITE_SLEEP_APP_URL || "https://asclepiossleep.com";

export default function App() {
  return (
    <div className="health-page">
      <header className="health-header">
        <span className="health-wordmark">ASCLEPIOS HEALTH</span>
      </header>

      <main className="health-hero">
        <p className="health-eyebrow">The Asclepios Health platform</p>
        <h1>Asclepios Health</h1>
        <p className="health-lede">
          Asclepios Health is the parent health platform behind a growing family of
          products and services. This is the independent home for the platform,
          separate from any single product beneath it.
        </p>
      </main>

      <section className="health-products" aria-label="Products under Asclepios Health">
        <h2>Products</h2>
        <a className="health-product-card" href={SLEEP_APP_URL}>
          <span className="health-product-label">Child product</span>
          <span className="health-product-name">Sleep</span>
          <span className="health-product-desc">
            Personalised sleep support, built on Asclepios Health.
          </span>
        </a>
      </section>

      <footer className="health-footer">
        <p>&copy; {new Date().getFullYear()} Asclepios Health.</p>
      </footer>
    </div>
  );
}
