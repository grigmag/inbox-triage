import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Mirrors icon.svg. iOS applies its own corner mask, so the tile is full-bleed.
export function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9b64f',
      }}
    >
      <svg
        width="112"
        height="112"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1d140d"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />

        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    </div>,
    size,
  );
}

export default AppleIcon;
