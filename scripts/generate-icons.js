// Script pour créer les icônes PWA en différentes tailles
// Utilise canvas pour convertir SVG en PNG

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Créer un SVG simple pour les icônes
const createIconSVG = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="128" fill="#0b0d0f"/>
  <path d="M256 128L384 384H128L256 128Z" fill="#22c55e"/>
  <circle cx="256" cy="320" r="32" fill="#fff"/>
  <text x="256" y="450" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="#fff" text-anchor="middle">RU</text>
</svg>`;

// Créer les fichiers SVG pour chaque taille
sizes.forEach(size => {
  const svgContent = createIconSVG(size);
  const filename = path.join(__dirname, '../public', `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svgContent);
  console.log(`✓ Créé: icon-${size}x${size}.svg`);
});

// Créer également des placeholders PNG (nécessitent une conversion manuelle ou sharp/jimp)
console.log('\n⚠ Les fichiers SVG ont été créés.');
console.log('Pour convertir en PNG, utilisez un outil comme:');
console.log('- https://www.npmjs.com/package/sharp');
console.log('- https://cloudconvert.com/svg-to-png');
console.log('- Ou renommez les .svg en .png pour le développement');
