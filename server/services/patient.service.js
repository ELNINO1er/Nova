const patient = {
  id: 'patient-demo',
  cmuNumber: 'CI-2024-0847-3692',
  firstName: 'Kouamé',
  lastName: 'Bamba',
  birthDate: '1974-03-15',
  sex: 'M',
  bloodType: 'O+',
  phone: '0789452311',
  email: 'k.bamba@example.ci',
  address: 'Cocody, Rue des Jardins',
  city: 'Abidjan',
  weightKg: 78,
  heightCm: 175,
  emergencyContact: {
    name: 'Aya Bamba',
    relationship: 'Épouse',
    phone: '0700112233',
  },
};

const vitals = [
  { id: 'vital-1', type: 'blood_pressure', label: 'Tension', value: '12/8', unit: 'mmHg', measuredAt: '2026-04-28T07:30:00.000Z' },
  { id: 'vital-2', type: 'blood_glucose', label: 'Glycémie', value: 0.95, unit: 'g/L', measuredAt: '2026-04-28T07:35:00.000Z' },
  { id: 'vital-3', type: 'heart_rate', label: 'Fréquence', value: 72, unit: 'bpm', measuredAt: '2026-04-28T07:40:00.000Z' },
  { id: 'vital-4', type: 'temperature', label: 'Température', value: 36.8, unit: '°C', measuredAt: '2026-04-28T07:45:00.000Z' },
];

const treatments = [
  {
    id: 'treatment-1',
    diagnosis: 'Hypertension artérielle',
    status: 'active',
    stage: 'Stade 1',
    progress: 75,
    startedAt: '2024-01-08',
    doctorName: 'Dr. Aïcha Touré',
    nextCheckupAt: '2026-05-02T14:30:00.000Z',
    medications: [
      { id: 'med-1', name: 'Amlodipine', dosage: '5mg', frequency: '1x/j' },
      { id: 'med-2', name: 'Aspirine', dosage: '100mg', frequency: '1x/j' },
    ],
  },
  {
    id: 'treatment-2',
    diagnosis: 'Diabète Type 2',
    status: 'controlled',
    stage: 'Contrôlé',
    progress: 90,
    startedAt: '2023-03-14',
    doctorName: 'Dr. Mariam Bamba',
    nextCheckupAt: '2026-05-15T09:00:00.000Z',
    medications: [
      { id: 'med-3', name: 'Metformine', dosage: '500mg', frequency: '2x/j' },
    ],
  },
];

const medicationSchedules = [
  { id: 'schedule-1', medicationId: 'med-1', name: 'Amlodipine', dosage: '5mg', time: '08:00', period: 'Matin', color: 'blue', interaction: false },
  { id: 'schedule-2', medicationId: 'med-3', name: 'Metformine', dosage: '500mg', time: '08:00', period: 'Matin', color: 'emerald', interaction: false },
  { id: 'schedule-3', medicationId: 'med-2', name: 'Aspirine', dosage: '100mg', time: '12:30', period: 'Midi', color: 'red', interaction: true },
  { id: 'schedule-4', medicationId: 'med-3', name: 'Metformine', dosage: '500mg', time: '20:00', period: 'Soir', color: 'emerald', interaction: false },
];

const appointments = [
  { id: 'apt-1', startsAt: '2026-05-02T14:30:00.000Z', doctorName: 'Dr. Aïcha Touré', specialty: 'Cardiologie', location: 'CHU Treichville', mode: 'onsite', status: 'confirmed' },
  { id: 'apt-2', startsAt: '2026-05-15T09:00:00.000Z', doctorName: 'Dr. Yao Konan', specialty: 'Médecine générale', location: 'Téléconsultation', mode: 'video', status: 'confirmed' },
  { id: 'apt-3', startsAt: '2026-05-28T11:00:00.000Z', doctorName: 'Dr. Mariam Bamba', specialty: 'Endocrinologie', location: 'PISAM Cocody', mode: 'onsite', status: 'confirmed' },
];

const vaccinations = [
  { id: 'vax-1', name: 'Tétanos', injectedAt: '2026-04-02', status: 'up_to_date', nextDueAt: '2036-04-02' },
  { id: 'vax-2', name: 'Hépatite B', injectedAt: '2024-01-15', status: 'up_to_date', nextDueAt: null },
  { id: 'vax-3', name: 'Fièvre jaune', injectedAt: '2020-06-20', status: 'up_to_date', nextDueAt: null },
  { id: 'vax-4', name: 'Méningite', injectedAt: '2023-02-10', status: 'due_soon', nextDueAt: '2026-02-10' },
];

const documents = [
  { id: 'doc-1', title: 'Ordonnance cardiologie', category: 'prescription', mimeType: 'application/pdf', sizeBytes: 245760, createdAt: '2026-04-20T10:00:00.000Z' },
  { id: 'doc-2', title: 'Analyse glycémie', category: 'lab', mimeType: 'application/pdf', sizeBytes: 180224, createdAt: '2026-04-18T08:00:00.000Z' },
  { id: 'doc-3', title: 'Carnet vaccination', category: 'vaccine', mimeType: 'application/pdf', sizeBytes: 98221, createdAt: '2026-04-02T12:00:00.000Z' },
];

let notes = [
  { id: 'note-1', title: 'Questions cardiologue', content: 'Parler des palpitations matinales.', color: 'amber', pinned: true, updatedAt: '2026-04-28T08:00:00.000Z' },
  { id: 'note-2', title: 'Alimentation', content: 'Réduire le sel cette semaine.', color: 'emerald', pinned: false, updatedAt: '2026-04-27T16:00:00.000Z' },
];

let settings = {
  notifications: { appointments: true, medications: true, messages: true },
  privacy: { emergencyQr: true, shareWithDoctors: true },
  display: { language: 'fr', density: 'comfortable' },
};

export function getDashboard() {
  return {
    profile: patient,
    healthScore: 82,
    latestVitals: vitals,
    nextAppointment: appointments[0],
    todayMedications: medicationSchedules,
    unreadMessages: 3,
    documentsCount: documents.length,
  };
}

export function getProfile() {
  return patient;
}

export function updateProfile(_patientId, changes) {
  Object.assign(patient, changes);
  return patient;
}

export function getVitals(_patientId, query) {
  const type = query.type;
  return type ? vitals.filter((vital) => vital.type === type) : vitals;
}

export function getTreatments() {
  return treatments;
}

export function getMedicationToday() {
  return medicationSchedules;
}

export function createMedicationIntake(patientId, scheduleId, payload) {
  return {
    id: `intake-${Date.now()}`,
    patientId,
    scheduleId,
    status: payload.status,
    takenAt: payload.takenAt || new Date().toISOString(),
  };
}

export function getAppointments() {
  return appointments;
}

export function getVaccinations() {
  return vaccinations;
}

export function getHistory() {
  return [
    { id: 'history-1', type: 'consultation', title: 'Consultation cardiologie', occurredAt: '2026-04-20T09:30:00.000Z', doctorName: 'Dr. Aïcha Touré' },
    { id: 'history-2', type: 'lab', title: 'Bilan sanguin', occurredAt: '2026-04-18T07:45:00.000Z', doctorName: 'Laboratoire PISAM' },
  ];
}

export function getDocuments(_patientId, query) {
  return query.category ? documents.filter((doc) => doc.category === query.category) : documents;
}

export function getConversations() {
  return [
    { id: 'conv-1', doctorName: 'Dr. Aïcha Touré', unreadCount: 2, lastMessage: 'Merci de surveiller votre tension.', updatedAt: '2026-04-28T09:00:00.000Z' },
    { id: 'conv-2', doctorName: 'Dr. Yao Konan', unreadCount: 1, lastMessage: 'Votre rendez-vous est confirmé.', updatedAt: '2026-04-27T15:10:00.000Z' },
  ];
}

export function getNotes() {
  return notes;
}

export function createNote(_patientId, payload) {
  const note = { id: `note-${Date.now()}`, ...payload, updatedAt: new Date().toISOString() };
  notes = [note, ...notes];
  return note;
}

export function updateNote(_patientId, id, changes) {
  notes = notes.map((note) => note.id === id ? { ...note, ...changes, updatedAt: new Date().toISOString() } : note);
  return notes.find((note) => note.id === id);
}

export function deleteNote(_patientId, id) {
  notes = notes.filter((note) => note.id !== id);
}

export function getSettings() {
  return settings;
}

export function updateSettings(_patientId, changes) {
  settings = deepMerge(settings, changes);
  return settings;
}

function deepMerge(target, source) {
  const next = { ...target };
  for (const [key, value] of Object.entries(source)) {
    next[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(next[key] || {}, value)
      : value;
  }
  return next;
}
