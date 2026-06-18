type DogStorySceneProps = {
  hookMessage: string;
  className?: string;
};

/** Lightweight CSS/SVG story loop — excited dog packs a bag and walks to the door. */
export function DogStoryScene({ hookMessage, className = "" }: DogStorySceneProps) {
  return (
    <div
      className={`dog-story-scene relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-mint/50 to-cream ${className}`}
      aria-hidden
    >
      <style>{`
        @keyframes dog-story-tail {
          0%, 100% { transform: rotate(-18deg); }
          50% { transform: rotate(18deg); }
        }
        @keyframes dog-story-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes dog-story-walk {
          0%, 35% { transform: translateX(0); }
          55%, 100% { transform: translateX(72px); }
        }
        @keyframes dog-story-item {
          0%, 20% { opacity: 0; transform: translateY(8px) scale(0.6); }
          28%, 100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dog-story-bubble {
          0%, 62% { opacity: 0; transform: translateY(8px) scale(0.92); }
          72%, 92% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-4px) scale(0.96); }
        }
        .dog-story-dog {
          animation: dog-story-walk 6s ease-in-out infinite, dog-story-bounce 0.55s ease-in-out infinite;
        }
        .dog-story-tail {
          transform-origin: 8px 34px;
          animation: dog-story-tail 0.35s ease-in-out infinite;
        }
        .dog-story-item-1 { animation: dog-story-item 6s ease-out infinite; }
        .dog-story-item-2 { animation: dog-story-item 6s ease-out 0.4s infinite; }
        .dog-story-item-3 { animation: dog-story-item 6s ease-out 0.8s infinite; }
        .dog-story-bubble {
          animation: dog-story-bubble 6s ease-out infinite;
        }
      `}</style>

      <svg viewBox="0 0 320 240" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <rect width="320" height="240" fill="transparent" />
        <rect x="248" y="48" width="56" height="152" rx="4" fill="#E8DCC8" stroke="#C4A882" strokeWidth="2" />
        <circle cx="292" cy="128" r="4" fill="#D4AF37" />
        <rect x="252" y="200" width="48" height="8" rx="2" fill="#B8956A" />

        <g className="dog-story-dog" transform="translate(36, 118)">
          <ellipse cx="34" cy="38" rx="28" ry="22" fill="#C68642" />
          <ellipse cx="52" cy="22" rx="16" ry="14" fill="#C68642" />
          <circle cx="58" cy="18" r="3" fill="#2B2B2B" />
          <ellipse cx="62" cy="24" rx="4" ry="3" fill="#F4A5AE" />
          <path className="dog-story-tail" d="M8 34 Q-8 18 -4 8 Q0 22 8 34" fill="#A66B2E" />
          <ellipse cx="22" cy="52" rx="6" ry="10" fill="#A66B2E" />
          <ellipse cx="38" cy="54" rx="6" ry="10" fill="#A66B2E" />
          <ellipse cx="54" cy="50" rx="5" ry="9" fill="#A66B2E" />
          <ellipse cx="66" cy="44" rx="5" ry="8" fill="#A66B2E" />
        </g>

        <g transform="translate(128, 148)">
          <rect x="0" y="16" width="64" height="40" rx="6" fill="#8B5E3C" />
          <path d="M8 16 L32 0 L56 16 Z" fill="#A0714F" />
          <circle className="dog-story-item-1" cx="18" cy="36" r="7" fill="#E85D75" />
          <path
            className="dog-story-item-2"
            d="M34 28 L34 44 M28 36 L40 36"
            stroke="#2E6B3F"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <rect className="dog-story-item-3" x="44" y="30" width="10" height="12" rx="3" fill="#F5C542" />
        </g>
      </svg>

      <div className="dog-story-bubble pointer-events-none absolute left-1/2 top-[12%] max-w-[85%] -translate-x-1/2 rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-brand-teal shadow-md ring-1 ring-black/5">
        {hookMessage}
      </div>
    </div>
  );
}
