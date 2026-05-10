export function BrutalistCard({ children, className = '', ...rest }) {
  return (
    <div className={`rounded-none border-2 border-black bg-white p-6 ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
