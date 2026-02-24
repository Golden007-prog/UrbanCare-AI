// ──────────────────────────────────────────────────────────
// User Model — Multi-Role In-Memory Store
// ──────────────────────────────────────────────────────────

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Roles: super_admin, hospital_admin, doctor, family, admin, lab, pharmacist
const users = [
  {
    id: 'U000',
    name: 'Platform Super Admin',
    email: 'super@urbancare.com',
    passwordHash: bcrypt.hashSync('super123', 10),
    role: 'super_admin',
    hospitalID: null, // Global access
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date('2023-01-01').toISOString(),
  },
  {
    id: 'U001',
    name: 'Dr. Ayesha Smith',
    email: 'dr.smith@urbancare.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: 'doctor',
    hospitalID: 'H001',
    linkedPatientIDs: ['P001', 'P002'],
    specialty: 'Cardiology',
    googleId: null,
    createdAt: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'U002',
    name: 'Dr. James Patel',
    email: 'dr.patel@urbancare.com',
    passwordHash: bcrypt.hashSync('password456', 10),
    role: 'doctor',
    hospitalID: 'H002',
    linkedPatientIDs: ['P003'],
    specialty: 'Neurology',
    googleId: null,
    createdAt: new Date('2024-02-20').toISOString(),
  },
  {
    id: 'U003',
    name: 'Admin User',
    email: 'legacyadmin@urbancare.com',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    hospitalID: 'H001',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'U004',
    name: 'Sarah Doe',
    email: 'sarah.doe@gmail.com',
    passwordHash: bcrypt.hashSync('family123', 10),
    role: 'family',
    hospitalID: 'H001',
    linkedPatientIDs: ['P001'],
    specialty: null,
    googleId: null,
    createdAt: new Date('2024-06-10').toISOString(),
  },
  {
    id: 'U005',
    name: 'Mike Brown',
    email: 'mike.brown@gmail.com',
    passwordHash: bcrypt.hashSync('family456', 10),
    role: 'family',
    hospitalID: 'H002',
    linkedPatientIDs: ['P003'],
    specialty: null,
    googleId: null,
    createdAt: new Date('2024-07-05').toISOString(),
  },
  {
    id: 'U006',
    name: 'Lab Tech Priya',
    email: 'priya.lab@urbancare.com',
    passwordHash: bcrypt.hashSync('lab123', 10),
    role: 'lab',
    hospitalID: 'H001',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date('2024-08-01').toISOString(),
  },
  {
    id: 'U007',
    name: 'Lab Tech Ravi',
    email: 'ravi.lab@citygeneral.com',
    passwordHash: bcrypt.hashSync('lab456', 10),
    role: 'lab',
    hospitalID: 'H002',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date('2024-08-15').toISOString(),
  },
  {
    id: 'U008',
    name: 'Pharmacist Neha',
    email: 'neha.pharma@urbancare.com',
    passwordHash: bcrypt.hashSync('pharma123', 10),
    role: 'pharmacist',
    hospitalID: 'H001',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date('2024-09-01').toISOString(),
  },
  {
    id: 'U009',
    name: 'Pharmacist Kamal',
    email: 'kamal.pharma@citygeneral.com',
    passwordHash: bcrypt.hashSync('pharma456', 10),
    role: 'pharmacist',
    hospitalID: 'H002',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date('2024-09-10').toISOString(),
  },
  {
    id: 'U010',
    name: 'Hospital Admin (Demo)',
    email: 'admin@demohospital.com',
    passwordHash: bcrypt.hashSync('demo123', 10),
    role: 'hospital_admin',
    hospitalID: 'H999',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'U011',
    name: 'Dr. Demo',
    email: 'doctor@demohospital.com',
    passwordHash: bcrypt.hashSync('demo123', 10),
    role: 'doctor',
    hospitalID: 'H999',
    linkedPatientIDs: [],
    specialty: 'Internal Medicine',
    googleId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'U012',
    name: 'Admin Director Singh',
    email: 'admin@urbancare.com',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'hospital_admin',
    hospitalID: 'H001',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date('2023-06-01').toISOString(),
  },
  // ── Demo Patients (can login to Patient Dashboard) ──
  {
    id: 'U013',
    name: 'John Doe',
    email: 'john.doe@urbancare.com',
    passwordHash: bcrypt.hashSync('patient123', 10),
    role: 'patient',
    hospitalID: 'H001',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date('2024-09-01').toISOString(),
  },
  {
    id: 'U014',
    name: 'Jane Smith',
    email: 'jane.smith@urbancare.com',
    passwordHash: bcrypt.hashSync('patient123', 10),
    role: 'patient',
    hospitalID: 'H001',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date('2024-10-15').toISOString(),
  },
  {
    id: 'U015',
    name: 'Michael Brown',
    email: 'michael.brown@citygeneral.com',
    passwordHash: bcrypt.hashSync('patient123', 10),
    role: 'patient',
    hospitalID: 'H002',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date('2024-11-20').toISOString(),
  },
  {
    id: 'U016',
    name: 'Sara Khan',
    email: 'sara.khan@greenvalley.com',
    passwordHash: bcrypt.hashSync('patient123', 10),
    role: 'patient',
    hospitalID: 'H003',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date('2024-12-01').toISOString(),
  },
  // ── Canonical Demo Users (demo-login endpoint) ──
  {
    id: 'DEMO-SA',
    name: 'Demo Super Admin',
    email: 'admin@demo.com',
    passwordHash: bcrypt.hashSync('demo123', 10),
    role: 'super_admin',
    hospitalID: null,
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'DEMO-HA',
    name: 'Demo Hospital Admin',
    email: 'hospital@demo.com',
    passwordHash: bcrypt.hashSync('demo123', 10),
    role: 'hospital_admin',
    hospitalID: 'H001',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'DEMO-DR',
    name: 'Demo Doctor',
    email: 'doctor@demo.com',
    passwordHash: bcrypt.hashSync('demo123', 10),
    role: 'doctor',
    hospitalID: 'H001',
    linkedPatientIDs: ['P001', 'P002'],
    specialty: 'General Medicine',
    googleId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'DEMO-PT',
    name: 'Demo Patient',
    email: 'patient@demo.com',
    passwordHash: bcrypt.hashSync('demo123', 10),
    role: 'patient',
    hospitalID: 'H001',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'DEMO-LB',
    name: 'Demo Lab Technician',
    email: 'lab@demo.com',
    passwordHash: bcrypt.hashSync('demo123', 10),
    role: 'lab',
    hospitalID: 'H001',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'DEMO-PH',
    name: 'Demo Pharmacist',
    email: 'pharma@demo.com',
    passwordHash: bcrypt.hashSync('demo123', 10),
    role: 'pharmacist',
    hospitalID: 'H001',
    linkedPatientIDs: [],
    specialty: null,
    googleId: null,
    createdAt: new Date().toISOString(),
  },
];

// ── Lookup Helpers ─────────────────────────────────────────

function findByEmail(email) {
  return users.find((u) => u.email === email) || null;
}

function findById(id) {
  return users.find((u) => u.id === id) || null;
}

function findByGoogleId(googleId) {
  return users.find((u) => u.googleId === googleId) || null;
}

function findOrCreateByGoogle(profile) {
  let user = findByGoogleId(profile.id);
  if (user) return user;

  const email =
    profile.emails && profile.emails.length > 0
      ? profile.emails[0].value
      : null;

  if (email) {
    user = findByEmail(email);
    if (user) {
      user.googleId = profile.id;
      return user;
    }
  }

  // New Google user — mark as 'pending' so frontend shows role selection modal
  const newUser = {
    id: `U${String(users.length + 1).padStart(3, '0')}`,
    name: profile.displayName || 'User',
    email: email || `google_${profile.id}@urbancare.com`,
    passwordHash: null,
    role: 'pending',
    hospitalID: null,
    linkedPatientIDs: [],
    specialty: null,
    googleId: profile.id,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  return newUser;
}

function sanitize(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function createUser(data) {
  const newUser = {
    id: `U${String(users.length + 1).padStart(3, '0')}`,
    name: data.name,
    email: data.email,
    passwordHash: data.password ? bcrypt.hashSync(data.password, 10) : null,
    role: data.role || 'family',
    hospitalID: data.hospitalID || 'H001',
    linkedPatientIDs: data.linkedPatientIDs || [],
    specialty: data.specialty || null,
    googleId: null,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  return newUser;
}

function findByHospital(hospitalId) {
  return users.filter((u) => u.hospitalID === hospitalId);
}

module.exports = {
  users,
  findByEmail,
  findById,
  findByGoogleId,
  findOrCreateByGoogle,
  sanitize,
  createUser,
  findByHospital,
};
