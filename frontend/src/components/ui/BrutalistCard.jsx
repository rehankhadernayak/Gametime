export function BrutalistCard({ children, className = '', ...rest }) {
  return (
    <div className={`box-border max-w-full min-w-0 rounded-none border-2 border-black bg-white p-6 ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
