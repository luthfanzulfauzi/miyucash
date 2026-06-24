'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center p-6 text-center">
      {/* Sleeping cat pixel art */}
      <div
        className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #B8D4E8 0%, #C9B8E8 100%)' }}
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 16 16"
          className="pixel-art"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Sleeping cat"
        >
          {/* Simplified sleeping Himalayan cat */}
          {/* Body curled up */}
          <rect x="3" y="9" width="10" height="4" fill="#F5EFE6" />
          <rect x="2" y="10" width="12" height="2" fill="#F5EFE6" />
          {/* Head */}
          <rect x="3" y="5" width="7" height="5" fill="#F5EFE6" />
          <rect x="2" y="6" width="9" height="3" fill="#F5EFE6" />
          {/* Ears */}
          <rect x="3" y="4" width="2" height="2" fill="#8B9BB4" />
          <rect x="7" y="4" width="2" height="2" fill="#8B9BB4" />
          <rect x="4" y="4" width="1" height="1" fill="#F2C4A0" />
          <rect x="8" y="4" width="1" height="1" fill="#F2C4A0" />
          {/* Closed eyes — sleeping */}
          <rect x="4" y="7" width="2" height="1" fill="#8B9BB4" />
          <rect x="7" y="7" width="2" height="1" fill="#8B9BB4" />
          {/* Nose */}
          <rect x="6" y="8" width="1" height="1" fill="#E8A0A0" />
          {/* Tail curled */}
          <rect x="12" y="10" width="2" height="1" fill="#8B9BB4" />
          <rect x="13" y="11" width="1" height="2" fill="#8B9BB4" />
          <rect x="11" y="12" width="2" height="1" fill="#8B9BB4" />
          {/* ZZZ */}
          <rect x="10" y="3" width="2" height="1" fill="#B8D4E8" />
          <rect x="11" y="4" width="1" height="1" fill="#B8D4E8" />
          <rect x="10" y="5" width="2" height="1" fill="#B8D4E8" />
          <rect x="13" y="1" width="2" height="1" fill="#C9B8E8" />
          <rect x="14" y="2" width="1" height="1" fill="#C9B8E8" />
          <rect x="13" y="3" width="2" height="1" fill="#C9B8E8" />
        </svg>
      </div>

      <h1
        className="text-2xl font-extrabold text-[#3D4A5C] mb-2"
        style={{ fontFamily: 'var(--font-nunito)' }}
      >
        Sedang Offline
      </h1>
      <p className="text-sm text-[#7A8899] max-w-xs leading-relaxed mb-8">
        MiyuCash sedang offline. Koneksi internet diperlukan untuk sync data.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-2xl font-bold text-sm text-[#3D4A5C] shadow-md transition-all active:scale-95"
        style={{ background: '#B8D4E8' }}
      >
        Coba Lagi
      </button>
    </div>
  )
}
