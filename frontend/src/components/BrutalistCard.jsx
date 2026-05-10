/**
 * 1-bit shell: 2px solid black border, sharp corners, white fill.
 */
export default function BrutalistCard({ children, className = '', as: Comp = 'div', ...rest }) {
  const combined = `brutalist-card${className ? ` ${className}` : ''}`;
  return (
    <Comp className={combined} {...rest}>
      {children}
    </Comp>
  );
}
