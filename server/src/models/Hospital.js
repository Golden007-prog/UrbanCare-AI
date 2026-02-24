// ──────────────────────────────────────────────────────────
// Hospital Model — In-Memory Store
// ──────────────────────────────────────────────────────────

const hospitals = [
  {
    id: 'H001',
    name: 'UrbanCare Medical Center',
    address: 'Metro Healthcare Campus, Block A',
    contact_email: 'admin@urbancare.com',
    subscription_plan: 'enterprise',
    suspended: false,
    createdAt: new Date('2023-06-01').toISOString(),
  },
  {
    id: 'H002',
    name: 'City General Hospital',
    address: 'Downtown Medical District, Tower B',
    contact_email: 'contact@citygeneral.com',
    subscription_plan: 'premium',
    suspended: false,
    createdAt: new Date('2023-08-15').toISOString(),
  },
  {
    id: 'H003',
    name: 'Green Valley Clinic',
    address: 'Suburban Health Park, Unit 5',
    contact_email: 'hello@greenvalley.com',
    subscription_plan: 'basic',
    suspended: false,
    createdAt: new Date('2024-01-10').toISOString(),
  },
  {
    id: 'H999',
    name: 'Demo Hospital',
    address: 'Virtual Demo City, Lab 1',
    contact_email: 'admin@demohospital.com',
    subscription_plan: 'enterprise',
    suspended: false,
    createdAt: new Date().toISOString(),
  }
];

// ── Counter for new hospital IDs ───────────────────────────
let nextId = 4;

function findById(id) {
  return hospitals.find((h) => h.id === id) || null;
}

function findAll() {
  return hospitals;
}

function create({ name, address, contact_email, subscription_plan = 'basic' }) {
  const id = `H${String(nextId++).padStart(3, '0')}`;
  const hospital = {
    id,
    name,
    address,
    contact_email,
    subscription_plan,
    suspended: false,
    createdAt: new Date().toISOString(),
  };
  hospitals.push(hospital);
  return hospital;
}

function suspend(id) {
  const hospital = findById(id);
  if (!hospital) return null;
  hospital.suspended = true;
  return hospital;
}

function unsuspend(id) {
  const hospital = findById(id);
  if (!hospital) return null;
  hospital.suspended = false;
  return hospital;
}

module.exports = { hospitals, findById, findAll, create, suspend, unsuspend };
