const CODE128_PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112"
];

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function code128Values(text: string): number[] {
  if (!text) {
    throw new Error("barcode text is required");
  }

  const values = [104];
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 127) {
      throw new Error("Code128-B only supports ASCII text");
    }
    values.push(code - 32);
  }

  const checksum =
    values.reduce((sum, value, index) => (index === 0 ? value : sum + value * index), 0) % 103;

  values.push(checksum, 106);
  return values;
}

export function renderCode128Svg(text: string): string {
  const moduleWidth = 2;
  const barHeight = 72;
  const quietZone = 18;
  const labelHeight = 24;
  const values = code128Values(text);
  let x = quietZone;
  const bars: string[] = [];

  for (const value of values) {
    const pattern = CODE128_PATTERNS[value];
    let black = true;

    for (const widthChar of pattern) {
      const width = Number(widthChar) * moduleWidth;
      if (black) {
        bars.push(`<rect x="${x}" y="0" width="${width}" height="${barHeight}" />`);
      }
      x += width;
      black = !black;
    }
  }

  const width = x + quietZone;
  const height = barHeight + labelHeight;

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(
    text
  )} Code128 barcode" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#fff"/>
<g fill="#000">${bars.join("")}</g>
<text x="${width / 2}" y="${barHeight + 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14">${escapeXml(
    text
  )}</text>
</svg>`;
}
