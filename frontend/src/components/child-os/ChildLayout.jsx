import './ChildLayout.css';

export function ChildLayout({ children }) {
  return (
    <div className="child-os-layout">
      <div className="child-os-layout__scanlines" aria-hidden />
      <main className="child-os-layout__main">{children}</main>
    </div>
  );
}
