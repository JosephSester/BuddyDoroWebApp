interface Props { eyeState: 'open' | 'closed' }

export function BearCubSVG({ eyeState }: Props) {
  return (
    <svg viewBox="0 0 110 115" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body — very round and chubby */}
      <ellipse cx="55" cy="74" rx="36" ry="32" fill="#8b6240" />
      {/* Tummy */}
      <ellipse cx="55" cy="78" rx="22" ry="20" fill="#c9a070" />

      {/* Round ears */}
      <circle cx="32" cy="32" r="14" fill="#8b6240" />
      <circle cx="78" cy="32" r="14" fill="#8b6240" />
      {/* Inner ear */}
      <circle cx="32" cy="32" r="8" fill="#c9a070" />
      <circle cx="78" cy="32" r="8" fill="#c9a070" />

      {/* Head — big and round */}
      <circle cx="55" cy="52" r="28" fill="#9b7050" />

      {/* Snout */}
      <ellipse cx="55" cy="63" rx="14" ry="11" fill="#c9a070" />
      {/* Nose */}
      <ellipse cx="55" cy="57" rx="6" ry="4.5" fill="#2b2213" />
      {/* Nose shine */}
      <circle cx="53" cy="55.5" r="1.5" fill="rgba(255,255,255,0.5)" />

      {/* Eyes */}
      {eyeState === 'open' ? (
        <>
          <circle cx="43" cy="47" r="6" fill="#2b2213" />
          <circle cx="67" cy="47" r="6" fill="#2b2213" />
          <circle cx="45" cy="45" r="2" fill="white" />
          <circle cx="69" cy="45" r="2" fill="white" />
        </>
      ) : (
        <>
          <path d="M39 47 Q43 43 47 47" stroke="#2b2213" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <path d="M63 47 Q67 43 71 47" stroke="#2b2213" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Blush */}
      <ellipse cx="36" cy="57" rx="6" ry="4" fill="rgba(180,100,60,0.22)" />
      <ellipse cx="74" cy="57" rx="6" ry="4" fill="rgba(180,100,60,0.22)" />

      {/* Smile */}
      <path d="M49 67 Q55 73 61 67" stroke="#6b4228" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Little scarf — cozy winter detail */}
      <path d="M26 72 Q55 80 84 72" stroke="#c0622a" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M26 72 Q55 80 84 72" stroke="#e8a882" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="4 6" />

      {/* Paws */}
      <ellipse cx="36" cy="102" rx="13" ry="8" fill="#8b6240" />
      <ellipse cx="74" cy="102" rx="13" ry="8" fill="#8b6240" />
      <ellipse cx="36" cy="100" rx="10" ry="6" fill="#9b7050" />
      <ellipse cx="74" cy="100" rx="10" ry="6" fill="#9b7050" />
      {/* Toe beans */}
      <circle cx="30" cy="99" r="2.5" fill="#8b6240" />
      <circle cx="36" cy="97" r="2.5" fill="#8b6240" />
      <circle cx="42" cy="99" r="2.5" fill="#8b6240" />
      <circle cx="68" cy="99" r="2.5" fill="#8b6240" />
      <circle cx="74" cy="97" r="2.5" fill="#8b6240" />
      <circle cx="80" cy="99" r="2.5" fill="#8b6240" />
    </svg>
  );
}
