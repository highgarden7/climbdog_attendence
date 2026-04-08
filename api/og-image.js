function renderPawIcon() {
  return `
    <g fill="#FFF7ED">
      <ellipse cx="600" cy="312" rx="112" ry="92" transform="rotate(-8 600 312)" />
      <ellipse cx="500" cy="188" rx="42" ry="58" transform="rotate(-20 500 188)" />
      <ellipse cx="575" cy="136" rx="40" ry="56" transform="rotate(-6 575 136)" />
      <ellipse cx="658" cy="142" rx="40" ry="56" transform="rotate(10 658 142)" />
      <ellipse cx="734" cy="198" rx="42" ry="58" transform="rotate(22 734 198)" />
    </g>
  `;
}

function renderSvg() {
  const pawIcon = renderPawIcon();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="80" y1="40" x2="1120" y2="590" gradientUnits="userSpaceOnUse">
      <stop stop-color="#172554"/>
      <stop offset="0.52" stop-color="#1D4ED8"/>
      <stop offset="1" stop-color="#0EA5E9"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(600 250) rotate(90) scale(260 360)">
      <stop stop-color="#FDE68A" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#FDE68A" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" rx="40" fill="url(#bg)"/>
  <rect x="36" y="36" width="1128" height="558" rx="28" stroke="rgba(255,255,255,0.22)"/>
  <circle cx="600" cy="250" r="270" fill="url(#glow)"/>
  <circle cx="960" cy="124" r="120" fill="#FFFFFF" fill-opacity="0.08"/>
  <circle cx="241" cy="525" r="92" fill="#FFFFFF" fill-opacity="0.06"/>
  ${pawIcon}
  <text x="600" y="450" text-anchor="middle" fill="#FFF7ED" font-size="80" font-weight="800" font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif">CLIMBDOG</text>
  <text x="600" y="510" text-anchor="middle" fill="#E0F2FE" font-size="30" font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif">클라이밍 벙개 공유 링크</text>
</svg>`;
}

export default async function handler(_request, response) {
  const svg = renderSvg();

  response.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  response.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400");
  response.status(200).send(svg);
}
