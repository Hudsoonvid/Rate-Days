/** Default poster for a story: a sunset mountain lake, drawn as SVG so it ships with no image assets. */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 340">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#5b4b9a"/><stop offset=".45" stop-color="#e58aa0"/><stop offset=".62" stop-color="#f7c59f"/>
</linearGradient>
<linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#f3b3a6"/><stop offset=".5" stop-color="#7d6aa8"/><stop offset="1" stop-color="#2b2550"/>
</linearGradient>
<linearGradient id="peak" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#f0a3a0"/><stop offset=".5" stop-color="#7c5c9c"/><stop offset="1" stop-color="#3d3166"/>
</linearGradient>
</defs>
<rect width="240" height="340" fill="url(#sky)"/>
<circle cx="168" cy="140" r="16" fill="#ffe2c4" opacity=".85"/>
<path d="M60 70q6-4 12 0M74 62q5-3 10 0M48 82q4-3 8 0" stroke="#3a2f5c" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M0 205 L58 150 L92 172 L138 92 L176 150 L206 130 L240 168 L240 210 L0 210Z" fill="url(#peak)"/>
<path d="M138 92 L126 120 L138 112 L146 128 L152 116 L164 132Z" fill="#fde6e1" opacity=".9"/>
<path d="M0 212 L0 196 L18 190 L30 172 L40 190 L56 178 L68 196 L90 184 L104 200 L126 188 L150 202 L176 186 L196 200 L218 190 L240 198 L240 214Z" fill="#2c2654"/>
<rect y="210" width="240" height="130" fill="url(#lake)"/>
<path d="M0 214 L58 262 L92 244 L138 318 L176 262 L206 282 L240 248 L240 214Z" fill="#a27fb0" opacity=".45"/>
<path d="M20 240h60M120 236h80M60 270h50M150 290h60" stroke="#ffe7d6" stroke-width="1.5" opacity=".45" stroke-linecap="round"/>
</svg>`;

export const DEFAULT_COVER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SVG)}`;
