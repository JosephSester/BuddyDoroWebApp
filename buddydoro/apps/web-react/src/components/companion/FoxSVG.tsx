interface Props { eyeState: 'open' | 'closed' }

export function FoxSVG({ eyeState }: Props) {
  return (
    <svg viewBox="0 0 110 115" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fluffy tail */}
      <ellipse cx="82" cy="82" rx="18" ry="22" fill="#c0622a" transform="rotate(20 82 82)" />
      <ellipse cx="80" cy="80" rx="10" ry="13" fill="#f5ead4" transform="rotate(20 80 80)" />

      {/* Body */}
      <ellipse cx="55" cy="72" rx="28" ry="26" fill="#c0622a" />
      {/* Chest white patch */}
      <ellipse cx="55" cy="76" rx="16" ry="18" fill="#f5ead4" />

      {/* Ears — pointed */}
      <polygon points="34,38 40,14 50,38" fill="#c0622a" />
      <polygon points="60,38 70,14 76,38" fill="#c0622a" />
      {/* Inner ear */}
      <polygon points="37,37 41,20 48,37" fill="#e8a882" />
      <polygon points="62,37 69,20 73,37" fill="#e8a882" />

      {/* Head */}
      <ellipse cx="55" cy="52" rx="26" ry="22" fill="#c0622a" />

      {/* Cheek fur patches */}
      <ellipse cx="36" cy="57" rx="9" ry="7" fill="#d97d4b" />
      <ellipse cx="74" cy="57" rx="9" ry="7" fill="#d97d4b" />

      {/* Snout — elongated */}
      <ellipse cx="55" cy="63" rx="11" ry="8" fill="#f5ead4" />
      {/* Nose */}
      <ellipse cx="55" cy="57.5" rx="4.5" ry="3" fill="#2b2213" />
      {/* Nose shine */}
      <circle cx="53.5" cy="56.5" r="1.2" fill="rgba(255,255,255,0.5)" />

      {/* Eyes */}
      {eyeState === 'open' ? (
        <>
          <ellipse cx="44" cy="48" rx="5" ry="5.5" fill="#2b2213" />
          <ellipse cx="66" cy="48" rx="5" ry="5.5" fill="#2b2213" />
          {/* Eye shine */}
          <circle cx="45.5" cy="46.5" r="1.8" fill="white" />
          <circle cx="67.5" cy="46.5" r="1.8" fill="white" />
          {/* Amber iris hint */}
          <ellipse cx="44" cy="49" rx="2.5" ry="3" fill="#c98a2e" opacity="0.5" />
          <ellipse cx="66" cy="49" rx="2.5" ry="3" fill="#c98a2e" opacity="0.5" />
        </>
      ) : (
        <>
          <path d="M40 48 Q44 44 48 48" stroke="#2b2213" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M62 48 Q66 44 70 48" stroke="#2b2213" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Blush */}
      <ellipse cx="37" cy="55" rx="5" ry="3" fill="rgba(232,120,60,0.30)" />
      <ellipse cx="73" cy="55" rx="5" ry="3" fill="rgba(232,120,60,0.30)" />

      {/* Smile */}
      <path d="M50 66 Q55 70 60 66" stroke="#8b5e3c" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Paws */}
      <ellipse cx="38" cy="96" rx="11" ry="7" fill="#c0622a" />
      <ellipse cx="72" cy="96" rx="11" ry="7" fill="#c0622a" />
      <ellipse cx="38" cy="94" rx="8" ry="5" fill="#d97d4b" />
      <ellipse cx="72" cy="94" rx="8" ry="5" fill="#d97d4b" />
    </svg>
  );
}
