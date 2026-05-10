export function BrutalistInput({ className = '', ...rest }) {
  return (
    <input
      className={`w-full rounded-none border-2 border-black bg-white p-3 text-black outline-none transition-colors focus:bg-black/5 ${className}`.trim()}
      {...rest}
    />
  );
}
