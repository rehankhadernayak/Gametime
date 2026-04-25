/**
 * Gametime parent surface card — uses design tokens only (no inline layout colors).
 */
export default function GTCard({ title, subtitle, children, className = '', footer = null }) {
  return (
    <section className={`gt-card ${className}`.trim()}>
      {(title || subtitle) && (
        <header className="gt-card__head">
          {title ? <h3 className="gt-card__title">{title}</h3> : null}
          {subtitle ? <p className="gt-card__sub">{subtitle}</p> : null}
        </header>
      )}
      <div className="gt-card__body">{children}</div>
      {footer ? <footer className="gt-card__footer">{footer}</footer> : null}
    </section>
  );
}
