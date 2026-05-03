/**
 * Wraps parent-facing UI blocks so shared tokens and layout (Phase 14+) stay consistent.
 */
export default function ParentTheme({ children, className = '' }) {
  return <div className={`parent-theme ${className}`.trim()}>{children}</div>;
}
