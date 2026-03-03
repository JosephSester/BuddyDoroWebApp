interface Props { eyeState: 'open' | 'closed' }

export function HedgehogSVG({ eyeState }: Props) {
  return (
    <svg viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="55" cy="66" rx="38" ry="34" fill="#c98a5e" />
      {/* Belly */}
      <ellipse cx="55" cy="70" rx="24" ry="20" fill="#e8c9a0" />
      {/* Spines */}
      <ellipse cx="55" cy="34" rx="7" ry="14" fill="#6b4c32" transform="rotate(-10 55 34)" />
      <ellipse cx="42" cy="37" rx="6" ry="13" fill="#5c4228" transform="rotate(-28 42 37)" />
      <ellipse cx="68" cy="37" rx="6" ry="13" fill="#5c4228" transform="rotate(28 68 37)" />
      <ellipse cx="34" cy="46" rx="5" ry="11" fill="#6b4c32" transform="rotate(-42 34 46)" />
      <ellipse cx="76" cy="46" rx="5" ry="11" fill="#6b4c32" transform="rotate(42 76 46)" />
      {/* Head */}
      <ellipse cx="55" cy="54" rx="26" ry="24" fill="#d4956a" />
      {/* Snout */}
      <ellipse cx="55" cy="65" rx="13" ry="10" fill="#e8c9a0" />
      {/* Nose */}
      <ellipse cx="55" cy="60" rx="5" ry="3.5" fill="#8b5e3c" />
      {/* Eyes */}
      {eyeState === 'open' ? (
        <>
          <circle cx="44" cy="52" r="5.5" fill="#2b2213" />
          <circle cx="66" cy="52" r="5.5" fill="#2b2213" />
          <circle cx="46" cy="50" r="1.8" fill="white" />
          <circle cx="68" cy="50" r="1.8" fill="white" />
        </>
      ) : (
        <>
          <path d="M40 52 Q44 48 48 52" stroke="#2b2213" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M62 52 Q66 48 70 52" stroke="#2b2213" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      )}
      {/* Blush */}
      <ellipse cx="37" cy="59" rx="5" ry="3.5" fill="rgba(201,98,70,0.25)" />
      <ellipse cx="73" cy="59" rx="5" ry="3.5" fill="rgba(201,98,70,0.25)" />
      {/* Smile */}
      <path d="M49 68 Q55 73 61 68" stroke="#8b5e3c" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Feet */}
      <ellipse cx="40" cy="97" rx="10" ry="6" fill="#c98a5e" />
      <ellipse cx="70" cy="97" rx="10" ry="6" fill="#c98a5e" />
    </svg>
  );
}
