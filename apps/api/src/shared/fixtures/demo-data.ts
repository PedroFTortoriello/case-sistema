export const financeOverview = {
  accountsReceivable: 584200,
  issuedCharges: 92,
  monthlyRevenue: 742100,
  openOperations: 37,
  averageFxRate: 5.47,
  billingStatus: {
    readyToBill: 14,
    awaitingDocuments: 8,
    overdue: 5,
  },
  cashFlowProjection: [
    { month: "Mai", amount: 742100 },
    { month: "Jun", amount: 801400 },
    { month: "Jul", amount: 768900 },
  ],
};

export const charges = [
  {
    id: "chg-1001",
    processId: "IMP-2026-0048",
    client: "Orion Components",
    method: "PIX",
    dueDate: "2026-06-05",
    currency: "BRL",
    amount: 18450,
    status: "open",
  },
  {
    id: "chg-1002",
    processId: "EXP-2026-0019",
    client: "Blue Port Foods",
    method: "Boleto",
    dueDate: "2026-05-30",
    currency: "USD",
    amount: 3280,
    status: "paid",
  },
];

export const serviceInvoices = [
  {
    id: "nfse-902",
    client: "Orion Components",
    cityProvider: "Indaiatuba",
    status: "pending",
    amount: 18450,
    serviceCode: "18.01",
  },
  {
    id: "nfse-903",
    client: "Blue Port Foods",
    cityProvider: "Indaiatuba",
    status: "authorized",
    amount: 9260,
    serviceCode: "26.01",
  },
];

export const operationsOverview = {
  opening: 6,
  documentation: 12,
  inTransit: 11,
  customs: 5,
  finished: 32,
};

export const processes = [
  {
    id: "IMP-2026-0048",
    direction: "import",
    client: "Orion Components",
    modal: "air",
    status: "customs",
    awb: "057-12345675",
    origin: "FRA",
    destination: "VCP",
    incoterm: "CIP",
    eta: "2026-05-28",
  },
  {
    id: "EXP-2026-0019",
    direction: "export",
    client: "Blue Port Foods",
    modal: "air",
    status: "in_transit",
    awb: "957-55667788",
    origin: "VCP",
    destination: "MIA",
    incoterm: "FCA",
    eta: "2026-05-29",
  },
];

export const awbs = [
  {
    id: "awb-1",
    processId: "IMP-2026-0048",
    number: "057-12345675",
    airline: "LATAM Cargo",
    status: "in_transit",
    origin: "FRA",
    destination: "VCP",
    weightKg: 830.5,
    volumeM3: 4.2,
    cargoValue: 126000,
  },
  {
    id: "awb-2",
    processId: "EXP-2026-0019",
    number: "957-55667788",
    airline: "American Airlines Cargo",
    status: "issued",
    origin: "VCP",
    destination: "MIA",
    weightKg: 412,
    volumeM3: 2.1,
    cargoValue: 68000,
  },
];

export const clients = [
  {
    id: "cli-orion",
    name: "Orion Components",
    defaultCurrency: "USD",
    spread: 0.08,
    defaultRateTable: "PTAX + acordo",
  },
  {
    id: "cli-blue-port",
    name: "Blue Port Foods",
    defaultCurrency: "EUR",
    spread: 0.06,
    defaultRateTable: "PTAX + contrato",
  },
];

export const fxRates = [
  { currency: "USD", officialRate: 5.4721, clientRate: 5.516, source: "BCB/PTAX" },
  { currency: "EUR", officialRate: 6.1114, clientRate: 6.1848, source: "BCB/PTAX" },
];

export const reportSummary = {
  revenueByMonth: [
    { month: "Jan", amount: 624000 },
    { month: "Fev", amount: 668300 },
    { month: "Mar", amount: 705900 },
    { month: "Abr", amount: 721100 },
    { month: "Mai", amount: 742100 },
  ],
  operationsByClient: [
    { client: "Orion Components", total: 18 },
    { client: "Blue Port Foods", total: 12 },
    { client: "North Harbor Pharma", total: 7 },
  ],
};

export const auditTrail = [
  {
    id: "aud-1",
    actor: "financeiro@case.com",
    action: "charge.created",
    target: "chg-1001",
    timestamp: "2026-05-24T18:12:44.000Z",
  },
  {
    id: "aud-2",
    actor: "operacional@case.com",
    action: "document.versioned",
    target: "doc-INV-001",
    timestamp: "2026-05-24T18:18:09.000Z",
  },
];
