import type { Plant, Revision, Scenario } from "@mifc/domain";

const audit = {
  createdAt: "2026-08-19T09:00:00-03:00",
  createdBy: "demo-user",
  updatedAt: "2026-08-19T09:00:00-03:00",
  updatedBy: "demo-user",
};

export const demoPlants: Plant[] = [
  {
    ...audit,
    id: "plant-osasco",
    code: "MFC",
    name: "Osasco",
    timezone: "America/Sao_Paulo",
    status: "active",
  },
];

export const demoScenarios: Scenario[] = [
  {
    ...audit,
    id: "scenario-target-2026",
    plantId: "plant-osasco",
    year: 2026,
    code: "MIFC-TARGET",
    name: "MIFC Target",
    status: "active",
  },
];

export const demoRevisions: Revision[] = [
  {
    ...audit,
    id: "revision-04",
    scenarioId: "scenario-target-2026",
    number: 4,
    label: "Rev. 04",
    status: "draft",
    notes: "Estrutura local de demonstração.",
  },
];

export const demoVolumeRows = [
  { id: "fh", customer: "Volvo FH", model: "FH", vehiclesPerDay: 85, reinforcement: 50, pairsPerDay: 128, workingDays: 250, shifts: 2, status: "Ativo" },
  { id: "vm", customer: "Volvo VM", model: "VM", vehiclesPerDay: 30, reinforcement: 90, pairsPerDay: 57, workingDays: 250, shifts: 2, status: "Ativo" },
  { id: "scania", customer: "Scania", model: "Longarina", vehiclesPerDay: 108, reinforcement: 50, pairsPerDay: 162, workingDays: 250, shifts: 2, status: "Ativo" },
  { id: "daf", customer: "DAF", model: "Chassi", vehiclesPerDay: 40, reinforcement: 90, pairsPerDay: 76, workingDays: 250, shifts: 2, status: "Ativo" },
] as const;

export const demoVolumeSummary = {
  activeCustomers: 4,
  vehiclesPerDay: 263,
  pairsPerDay: 423,
  annualPairs: 105750,
};

export const demoCapacityRows = [
  { id: "rf3", process: "Roll Former 3", cycleTime: 48, capacityPerHour: 75, capacityPerDay: 1200, shifts: 2, availableHours: 16.7, efficiency: 85, wip: 68, status: "Ativo" },
  { id: "beatty", process: "Beatty", cycleTime: 62, capacityPerHour: 58, capacityPerDay: 928, shifts: 2, availableHours: 16, efficiency: 82, wip: 132, status: "Ativo" },
  { id: "paint", process: "Pintura", cycleTime: 110, capacityPerHour: 33, capacityPerDay: 528, shifts: 2, availableHours: 16, efficiency: 60, wip: 150, status: "Revisar" },
  { id: "stenhoj", process: "Stenhoj", cycleTime: 60, capacityPerHour: 60, capacityPerDay: 960, shifts: 2, availableHours: 16, efficiency: 90, wip: 110, status: "Ativo" },
] as const;

export const demoCapacitySummary = {
  activeProcesses: 4,
  totalCapacityPerDay: 3616,
  bottleneck: "Pintura",
  averageUtilizationPercent: 79,
};

export const demoMetrics = {
  leadTime: "7,11 dias",
  valueAdded: "0,365 dias",
  bottleneck: "Pintura",
  totalWip: "720 pç",
};
