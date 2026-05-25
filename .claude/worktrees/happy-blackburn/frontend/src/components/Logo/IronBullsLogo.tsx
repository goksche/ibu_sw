// Iron Bulls Logo Component - Uses original logo image from iron-bulls.ch
import React from 'react';

interface LogoProps {
  size?: number;
  style?: React.CSSProperties;
}

export default function IronBullsLogo({ size = 64, style }: LogoProps) {
  // Mögliche Logo-Pfade - der erste funktionierende wird verwendet
  const logoPaths = [
    'https://www.iron-bulls.ch/images/logo.png',
    'https://www.iron-bulls.ch/assets/logo.png',
    'https://www.iron-bulls.ch/logo.png',
    'https://www.iron-bulls.ch/img/logo.png',
    '/logo.png', // Lokaler Fallback falls Logo in public/ liegt
  ];

  const [currentPathIndex, setCurrentPathIndex] = React.useState(0);

  const handleError = () => {
    if (currentPathIndex < logoPaths.length - 1) {
      setCurrentPathIndex(currentPathIndex + 1);
    }
  };

  return (
    <img
      src={logoPaths[currentPathIndex]}
      alt="Iron Bulls Uri Logo"
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
        display: 'block',
        ...style,
      }}
      onError={handleError}
    />
  );
}
