export default function Logo({ size = 'md', showWordmark = true }) {
  const sealSize = size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-16 h-16' : 'w-11 h-11';
  const fontSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${sealSize} rounded-full flex items-center justify-center shadow-seal shrink-0`}
        style={{
          background: 'radial-gradient(circle at 35% 30%, #E0BC4F, #C9A227 55%, #9C7D1A 100%)',
        }}
      >
        <span className="font-display italic font-semibold text-ink" style={{ fontSize: size === 'lg' ? 28 : size === 'sm' ? 16 : 20 }}>
          G
        </span>
      </div>
      {showWordmark && (
        <span className={`font-display font-semibold text-ink ${fontSize} leading-tight`}>
          By Grace Cab
        </span>
      )}
    </div>
  );
}
