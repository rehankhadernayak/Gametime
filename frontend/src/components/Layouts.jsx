/**
 * Layout scoping wrappers.
 *
 * The global `app.css` is dark-themed and intended for the authenticated
 * dashboard surface. The marketing landing page uses its own light-mode
 * design system (HomePage.css). To prevent style collision we wrap each
 * surface in a dedicated layout root that scopes CSS via a `data-surface`
 * attribute:
 *
 *   <ParentLayout> – marketing / public landing (light, .hp-* scope)
 *   <ChildLayout>  – authenticated app (dark, dashboard scope)
 *
 * Components that need "child of" scoping can target
 *   [data-surface="landing"] .my-class
 *   [data-surface="app"]     .my-class
 */

export function ParentLayout({ children, className = '' }) {
  return (
    <div data-surface="landing" className={`gt-parent-layout ${className}`.trim()}>
      {children}
    </div>
  );
}

export function ChildLayout({ children, className = '' }) {
  return (
    <div data-surface="app" className={`gt-child-layout ${className}`.trim()}>
      {children}
    </div>
  );
}
