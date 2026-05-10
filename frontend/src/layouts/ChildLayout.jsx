/**
 * Child OS shell: retro arcade terminal frame (black field, white ink).
 * Uses global Tailwind font (IBM Plex Mono) + grid-20 rhythm via ascii-bg-inverted.
 */

export default function ChildLayout({ children }) {
  return (
    <div className="relative min-h-screen bg-black text-white font-sans">
      <div className="ascii-bg-inverted" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
