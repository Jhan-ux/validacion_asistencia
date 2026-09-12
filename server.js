const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Path to JSON data
const dataFilePath = path.join(__dirname, 'data', 'guests.json');

// In-memory cache for fast access
let guestsCache = [];

function loadGuests() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf8');
      guestsCache = JSON.parse(raw);
    } else {
      guestsCache = [];
    }
  } catch (err) {
    console.error('Error loading guests.json:', err);
    guestsCache = [];
  }
}

function saveGuests() {
  try {
    const dir = path.dirname(dataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(guestsCache, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving guests.json:', err);
  }
}

// Initial load
loadGuests();

// Helper to calculate statistics
function getStats() {
  const totalGuests = guestsCache.length;
  const checkedInCount = guestsCache.filter(g => g.checkedIn).length;
  const pendingCount = totalGuests - checkedInCount;
  const totalCompanionsExpected = guestsCache.reduce((acc, g) => acc + (g.companions || 0), 0);
  const companionsEntered = guestsCache.reduce((acc, g) => acc + (g.checkedIn ? (g.companionsEntered || 0) : 0), 0);
  const totalPeopleEntered = checkedInCount + companionsEntered;
  const attendanceRate = totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0;

  return {
    totalGuests,
    checkedInCount,
    pendingCount,
    totalCompanionsExpected,
    companionsEntered,
    totalPeopleEntered,
    attendanceRate
  };
}

// GET all guests and stats
app.get('/api/guests', (req, res) => {
  res.json({
    success: true,
    stats: getStats(),
    guests: guestsCache
  });
});

// POST Check-in / Check-out toggle
app.post('/api/guests/checkin', (req, res) => {
  const { id, checkedIn, companionsEntered, notes } = req.body;
  const guest = guestsCache.find(g => g.id === id);

  if (!guest) {
    return res.status(404).json({ success: false, message: 'Invitado no encontrado' });
  }

  guest.checkedIn = checkedIn !== undefined ? Boolean(checkedIn) : !guest.checkedIn;
  guest.checkInTime = guest.checkedIn ? new Date().toISOString() : null;
  if (companionsEntered !== undefined) {
    guest.companionsEntered = Math.max(0, parseInt(companionsEntered, 10) || 0);
  } else if (guest.checkedIn && (guest.companionsEntered === 0 || guest.companionsEntered === undefined)) {
    guest.companionsEntered = guest.companions || 0;
  }
  if (notes !== undefined) {
    guest.notes = notes;
  }

  saveGuests();

  res.json({
    success: true,
    guest,
    stats: getStats()
  });
});

// POST Add new walk-in / fast registered guest
app.post('/api/guests/add', (req, res) => {
  const { name, phone, companions, email, address, responsible, checkInNow } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
  }

  const cleanPhone = (phone || '').trim();
  const phoneDigits = cleanPhone.replace(/\D/g, '');
  const comps = parseInt(companions || 0, 10) || 0;
  const isCheckedIn = Boolean(checkInNow);

  const newGuest = {
    id: `MSA-REG-${Date.now().toString().slice(-4)}`,
    name: name.trim(),
    phone: cleanPhone,
    phoneDigits,
    email: (email || '').trim(),
    address: (address || '').trim(),
    responsible: (responsible || 'Registro en Puerta').trim(),
    companions: comps,
    checkedIn: isCheckedIn,
    checkInTime: isCheckedIn ? new Date().toISOString() : null,
    companionsEntered: isCheckedIn ? comps : 0,
    notes: 'Registrado en el evento',
    isWalkIn: true
  };

  guestsCache.unshift(newGuest);
  saveGuests();

  res.json({
    success: true,
    guest: newGuest,
    stats: getStats()
  });
});

// POST Delete guest
app.post('/api/guests/delete', (req, res) => {
  const { id } = req.body;
  const index = guestsCache.findIndex(g => g.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Invitado no encontrado' });
  }

  const deletedGuest = guestsCache.splice(index, 1)[0];
  saveGuests();

  res.json({
    success: true,
    message: 'Invitado eliminado correctamente',
    guest: deletedGuest,
    stats: getStats()
  });
});

// DELETE Guest by ID
app.delete('/api/guests/:id', (req, res) => {
  const { id } = req.params;
  const index = guestsCache.findIndex(g => g.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Invitado no encontrado' });
  }

  const deletedGuest = guestsCache.splice(index, 1)[0];
  saveGuests();

  res.json({
    success: true,
    message: 'Invitado eliminado correctamente',
    guest: deletedGuest,
    stats: getStats()
  });
});

// POST Batch sync (useful for Vercel/localStorage multi-device or offline backup)
app.post('/api/guests/sync', (req, res) => {
  const { guests } = req.body;
  if (Array.isArray(guests) && guests.length > 0) {
    guestsCache = guests;
    saveGuests();
  }
  res.json({
    success: true,
    stats: getStats(),
    count: guestsCache.length
  });
});

// GET Export to Excel
app.get('/api/guests/export', (req, res) => {
  try {
    const exportData = guestsCache.map((g, index) => ({
      'N°': index + 1,
      'Código ID': g.id,
      'Nombre Completo': g.name,
      'Teléfono': g.phone,
      'Correo': g.email,
      'Dirección': g.address,
      'Responsable': g.responsible,
      'Acompañantes Permitidos': g.companions,
      'Estado Ingreso': g.checkedIn ? 'INGRESÓ' : 'NO INGRESÓ',
      'Hora de Ingreso': g.checkInTime ? new Date(g.checkInTime).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '-',
      'Acompañantes que Ingresaron': g.checkedIn ? (g.companionsEntered || 0) : 0,
      'Total Personas Ingresadas': g.checkedIn ? (1 + (g.companionsEntered || 0)) : 0,
      'Notas': g.notes || ''
    }));

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Asistencia');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Reporte_Asistencia_MSA_Linea_Premium.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error('Error exporting Excel:', err);
    res.status(500).json({ success: false, message: 'Error al generar reporte' });
  }
});

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 SERVIDOR MSA ASISTENCIA ACTIVO`);
    console.log(`📍 URL Local: http://localhost:${PORT}`);
    console.log(`👥 Total Invitados cargados: ${guestsCache.length}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
