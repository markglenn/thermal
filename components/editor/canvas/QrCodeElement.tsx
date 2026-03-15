'use client';

export function QrCodeElement() {
  return (
    <div className="w-full h-full border border-gray-400 bg-white flex items-center justify-center">
      <svg viewBox="0 0 10 10" className="w-3/4 h-3/4">
        <rect x="0" y="0" width="3" height="3" fill="black" />
        <rect x="7" y="0" width="3" height="3" fill="black" />
        <rect x="0" y="7" width="3" height="3" fill="black" />
        <rect x="4" y="4" width="2" height="2" fill="black" />
      </svg>
    </div>
  );
}
