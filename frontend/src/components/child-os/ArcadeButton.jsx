import './ArcadeButton.css';

export function ArcadeButton({ children, className = '', variant, block, type = 'button', ...rest }) {
  const mods = [
    'arcade-button',
    block ? 'arcade-button--block' : '',
    variant === 'danger' ? 'arcade-button--danger' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={mods} {...rest}>
      {children}
    </button>
  );
}
