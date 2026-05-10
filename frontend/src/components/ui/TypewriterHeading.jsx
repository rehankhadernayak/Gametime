function stepCountForChildren(children) {
  if (typeof children === 'string') {
    return Math.max(children.length, 8);
  }
  if (children == null) {
    return 16;
  }
  return 24;
}

export function TypewriterHeading({ children, className = '', style, ...rest }) {
  const steps = stepCountForChildren(children);
  return (
    <h1
      className={`typewriter-heading font-bold uppercase ${className}`.trim()}
      style={{ '--typewriter-steps': steps, ...style }}
      {...rest}
    >
      <span className="typewriter-heading__grid">
        <span className="typewriter-heading__measure" aria-hidden>
          {children}
        </span>
        <span className="typewriter-heading__text">{children}</span>
      </span>
      <span className="typewriter-heading__cursor cursor-blink" aria-hidden />
    </h1>
  );
}
