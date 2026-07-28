type MembershipFloatingDogIllustrationProps = {
  className?: string;
};

/** Lightweight brand-coloured dog reaching upward with front paws. */
export function MembershipFloatingDogIllustration({
  className = "",
}: MembershipFloatingDogIllustrationProps) {
  return (
    <svg
      viewBox="0 0 88 76"
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="mfdb-fur" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#f5e8da" />
          <stop offset="100%" stopColor="#c4a48a" />
        </linearGradient>
        <linearGradient id="mfdb-belly" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fffaf5" />
          <stop offset="100%" stopColor="#efe3d6" />
        </linearGradient>
        <linearGradient id="mfdb-collar" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7eb89a" />
          <stop offset="100%" stopColor="#5a9a7a" />
        </linearGradient>
      </defs>

      <g className="membership-floating-dog-pull">
        <ellipse cx="44" cy="70" rx="18" ry="3.5" fill="#1a1a1f" opacity="0.12" />

        <g className="membership-floating-dog-paws">
          <path
            d="M24 18 C22 8 30 2 36 8 L38 20 Z"
            fill="url(#mfdb-fur)"
            stroke="#b8957a"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <path
            d="M64 18 C66 8 58 2 52 8 L50 20 Z"
            fill="url(#mfdb-fur)"
            stroke="#b8957a"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </g>

        <ellipse cx="44" cy="48" rx="22" ry="18" fill="url(#mfdb-fur)" />
        <ellipse cx="44" cy="52" rx="13" ry="10" fill="url(#mfdb-belly)" />
        <path
          d="M28 36 Q44 32 60 36 L58 40 Q44 43 30 40 Z"
          fill="url(#mfdb-collar)"
          opacity="0.9"
        />

        <circle cx="44" cy="28" r="15" fill="url(#mfdb-fur)" />
        <ellipse cx="44" cy="31" rx="9" ry="7" fill="url(#mfdb-belly)" />
        <ellipse cx="36" cy="27" rx="4.5" ry="5.5" fill="#f5e8da" stroke="#b8957a" strokeWidth="0.6" />
        <ellipse cx="52" cy="27" rx="4.5" ry="5.5" fill="#f5e8da" stroke="#b8957a" strokeWidth="0.6" />
        <circle cx="40" cy="26" r="1.6" fill="#3d3228" />
        <circle cx="48" cy="26" r="1.6" fill="#3d3228" />
        <ellipse cx="44" cy="31" rx="3" ry="2.2" fill="#fffdfb" />
        <circle cx="44" cy="30" r="1.3" fill="#3d3228" />

        <path
          d="M58 24 C66 20 72 24 70 30 C68 34 62 33 58 28 Z"
          fill="url(#mfdb-fur)"
          stroke="#b8957a"
          strokeWidth="0.6"
        />
      </g>
    </svg>
  );
}
