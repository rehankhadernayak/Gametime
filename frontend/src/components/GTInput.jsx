import { useId } from 'react';

/**
 * Labelled text-style input for parent surfaces (matches GTCard / ParentTheme).
 */
export default function GTInput({
  label,
  hint,
  id: idProp,
  className = '',
  inputClassName = '',
  children,
  ...inputProps
}) {
  const uid = useId();
  const inputId = idProp || uid;
  return (
    <div className={`gt-field ${className}`.trim()}>
      {label ? (
        <label className="gt-input-label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input id={inputId} className={`gt-input ${inputClassName}`.trim()} {...inputProps} />
      {hint ? <p className="gt-input-hint">{hint}</p> : null}
      {children}
    </div>
  );
}
