'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center p-6 text-center">
      {/* Cat mascot */}
      <div className="relative mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt="MiyuCash mascot"
          width={112}
          height={112}
          className="rounded-3xl shadow-lg"
        />
        {/* ZZZ bubble */}
        <div
          className="absolute -top-3 -right-3 px-2 py-1 rounded-xl text-xs font-extrabold shadow-sm"
          style={{
            background: 'rgba(201,184,232,0.9)',
            color: '#7B5EA7',
            fontFamily: 'var(--font-nunito)',
          }}
        >
          z z z
        </div>
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
