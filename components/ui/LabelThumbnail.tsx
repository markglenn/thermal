interface Props {
  src: string | null;
  alt: string;
  widthInches: number | null;
  heightInches: number | null;
}

export function formatSize(w: number, h: number): string {
  const fmt = (n: number) => Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${fmt(w)}" × ${fmt(h)}"`;
}

export function LabelThumbnail({ src, alt, widthInches, heightInches }: Props) {
  return (
    <div className="space-y-1">
      <div className="aspect-4/3 bg-gray-50 rounded flex items-center justify-center overflow-hidden p-2">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="max-w-full max-h-full object-contain border border-gray-200 shadow-sm"
          />
        ) : (
          <span className="text-xs text-gray-300">No preview</span>
        )}
      </div>
      {widthInches != null && heightInches != null && (
        <div className="text-[10px] text-gray-400 text-center">
          {formatSize(widthInches, heightInches)}
        </div>
      )}
    </div>
  );
}
