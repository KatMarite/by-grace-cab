export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-ink text-ivory hover:bg-ink-light',
    gold: 'bg-gold text-ink hover:bg-gold-light',
    outline: 'border border-ink text-ink hover:bg-ink hover:text-ivory bg-transparent',
    ghost: 'text-ink hover:bg-ink/5 bg-transparent',
    danger: 'bg-clay text-ivory hover:bg-clay-light',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
