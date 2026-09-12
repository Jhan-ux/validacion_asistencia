const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function cleanPhone(raw) {
  if (raw === undefined || raw === null || raw === '') return '';
  let str = String(raw).trim();
  // Handle scientific notation e.g. 9.76350969E8 or numbers like 9.36892451E8
  if (/^\d+(\.\d+)?[eE][+-]?\d+$/i.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      str = String(Math.round(num));
    }
  } else if (/^\d+\.0+$/.test(str)) {
    str = String(parseInt(str, 10));
  }
  return str;
}

function getDigitsOnly(str) {
  if (!str) return '';
  return String(str).replace(/\D/g, '');
}

function processExcel(filePath) {
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(sheet);

  const guests = rawData.map((row, index) => {
    const rawPhone = row['Número telefónico'];
    const phone = cleanPhone(rawPhone);
    const phoneDigits = getDigitsOnly(phone);
    const companions = parseInt(row['Acompañantes'] || 0, 10) || 0;
    const name = (row['Nombre completo'] || '').trim();
    const responsible = (row['Persona responsable de la invitación'] || '').trim();
    const email = (row['Correo electrónico'] || '').trim();
    const address = (row['Dirección (importante para dejar invitación)'] || '').trim();

    return {
      id: `MSA-${String(index + 1).padStart(3, '0')}`,
      name,
      phone,
      phoneDigits,
      email,
      address,
      responsible,
      companions,
      checkedIn: false,
      checkInTime: null,
      companionsEntered: 0,
      notes: ''
    };
  });

  return guests;
}

const excelPath = path.join(__dirname, '..', 'LISTA DE INVITADOS ESPECIALES - EVENTO LÍNEA PREMIUM (respuestas) (3).xlsx');
if (fs.existsSync(excelPath)) {
  const guests = processExcel(excelPath);
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const outPath = path.join(dataDir, 'guests.json');
  fs.writeFileSync(outPath, JSON.stringify(guests, null, 2), 'utf8');
  console.log(`Successfully exported ${guests.length} guests to ${outPath}`);
} else {
  console.error(`Excel file not found at ${excelPath}`);
}
