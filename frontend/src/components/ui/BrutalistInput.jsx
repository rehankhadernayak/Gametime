const fieldBase =
  'w-full rounded-none border-2 border-black bg-white p-3 text-black outline-none transition-colors focus:bg-black/5';

export function BrutalistInput({ className = '', ...rest }) {
  return <input className={`${fieldBase} ${className}`.trim()} {...rest} />;
}

export function BrutalistTextarea({ className = '', ...rest }) {
  return (
    <textarea className={`${fieldBase} min-h-[7.5rem] resize-y font-sans ${className}`.trim()} {...rest} />
  );
}
