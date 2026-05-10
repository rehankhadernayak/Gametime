const base =
  'rounded-none border-2 border-white bg-black px-8 py-6 text-center text-2xl font-bold uppercase tracking-wide text-white transition-[color,background-color,transform] ' +
  'hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-white hover:text-black ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ' +
  'active:translate-x-[2px] active:translate-y-[2px] disabled:pointer-events-none disabled:opacity-40';

export function ArcadeButton({ children, className = '', type = 'button', ...rest }) {
  return (
    <button type={type} className={`${base} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
