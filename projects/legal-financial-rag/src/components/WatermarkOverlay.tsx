import React from 'react';

interface WatermarkOverlayProps {
  label?: string;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  label = 'CONFIDENTIAL & ATTORNEY-CLIENT PRIVILEGED',
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.04,
        fontSize: '2rem',
        fontWeight: 800,
        transform: 'rotate(-25deg)',
        color: '#ffffff',
        pointerEvents: 'none',
        zIndex: 0,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
      }}
      aria-hidden="true"
    >
      {label}
    </div>
  );
};
