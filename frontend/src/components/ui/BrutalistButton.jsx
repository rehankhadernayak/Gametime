import { forwardRef } from 'react';

const base =
  'rounded-none border-2 border-black bg-white px-6 py-2 font-bold uppercase text-black transition-[color,background-color,transform,box-shadow] ' +
  'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-black hover:text-white ' +
  'hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black';

const variants = {
  default: '',
  inverse:
    'bg-black text-white hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
  /** Abort / destructive actions — still 1-bit (no colour); dashed frame reads as “halt”. */
  danger:
    'border-dashed !shadow-none hover:!shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:border-solid',
};

export const BrutalistButton = forwardRef(function BrutalistButton(
  { children, onClick, variant = 'default', type = 'button', className = '', ...rest },
  ref
) {
  const v = variants[variant] ?? variants.default;
  return (
    <button ref={ref} type={type} onClick={onClick} className={`${base} ${v} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
});
