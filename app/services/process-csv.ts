import type Papa from "papaparse";

export type CsvRow = Record<string, string>;
export type CsvResult = Papa.ParseResult<CsvRow> & {
  fileName: string;
};

export type FacilityIndicators = {
  facilityId: string;
  totalDeliveries: number;
  liveBirths: number;
  stillbirths: number;
  earlyDeaths: number;
  lateDeaths: number;
  asphyxiaDeaths: number;
  prematurityDeaths: number;
  sepsisDeaths: number;
  stillBirthsRate: number;
  neonatalMortalityRate: number;
  asphyxiaProportion: number;
  // The parser returns one result per uploaded file, so identify datasets by
  // filename before choosing which calculations can safely run.
  prematurityProportion: number;
  sepsisProportion: number;
};

export type ClinicalEffectivenessMetric = {
  facilityId: string;
  survivalScore: number;
  deathAuditScore: number;
  clinicalEffectivenessScore: number;
};

// This is the final flat row shape for the Quarterly Health Bulletin export.
// Scores that are not calculated yet remain null instead of being invented.
export type QuarterlyHealthBulletinRow = {
  facilityId: string;
  facilityName: string;
  totalDeliveries: number;
  liveBirths: number;
  stillbirths: number;
  earlyDeaths: number;
  lateDeaths: number;
  asphyxiaDeaths: number;
  prematurityDeaths: number;
  sepsisDeaths: number;
  stillBirthsRate: number;
  neonatalMortalityRate: number;
  asphyxiaProportion: number;
  prematurityProportion: number;
  sepsisProportion: number;
  clinicalEffectivenessScore: number | null;
  criticalReadinessScore: number | null;
  operationalQualityScore: number | null;
  overallScore: number | null;
};

type GroupedFiles = Record<string, Record<string, CsvRow[]>>;

export type BulletinReport = {
  topFacilities: QuarterlyHealthBulletinRow[];
  maternalIndicators: QuarterlyHealthBulletinRow[];
  performanceScores: QuarterlyHealthBulletinRow[];
};

export function handleGenerate(
  results: CsvResult[],
): BulletinReport {
  const clinicalResult = results.find(
    (result) => result.fileName === "clinical_neonatal.csv",
  );

  const facilitiesResult = results.find(
    (result) => result.fileName === "facilities.csv",
  // Clinical data contains one row per facility and reporting month. Grouping
  // first ensures each facility's total includes all of its reporting months.
  );

  const topFacilities =
    clinicalResult && facilitiesResult
      ? calcTopFacilities(clinicalResult, facilitiesResult)
      : [];

  const maternalIndicators =
    clinicalResult && facilitiesResult
      ? getMaternalHealthIndicators(clinicalResult, facilitiesResult)
      : [];


  // Keep datasets separated by filename so later metrics can join only the
  // files they need while using facility_id as the shared key.
  const groupedFiles = results.reduce<Record<string, Record<string, CsvRow[]>>>(
    (files, result) => {
      files[result.fileName] = groupedByFacility(result.data);
      return files;
    },
    {},
  );

  return {
    topFacilities: topFacilities.map((facility) => ({
      facilityId: facility.facilityId,
      facilityName: facility.facilityName,
      totalDeliveries: facility.totalDeliveries,
      liveBirths: 0,
      stillbirths: 0,
      earlyDeaths: 0,
      lateDeaths: 0,
      asphyxiaDeaths: 0,
      prematurityDeaths: 0,
      sepsisDeaths: 0,
      stillBirthsRate: 0,
      neonatalMortalityRate: 0,
      asphyxiaProportion: 0,
      prematurityProportion: 0,
      sepsisProportion: 0,
      clinicalEffectivenessScore: null,
      criticalReadinessScore: null,
      operationalQualityScore: null,
      overallScore: null,
    })),
    maternalIndicators,
    performanceScores: generatePerformanceScores(groupedFiles),
  };
}

function calcTopFacilities(
  clinicalResult: CsvResult,
  facilitiesResult: CsvResult,
) {

  const clinicalRecords = clinicalResult.data;
  const groupedFacilities = groupedByFacility(clinicalRecords);

  //Sum up the total_deliveries across all reporting months to find each facility's total patient volume
  const totalDeliveries: Record<string, number> = {};

  Object.entries(groupedFacilities).forEach(([facilityId, records]) => {
    const facilityTotal = records.reduce((total, record) => {
      return total + Number(record.total_deliveries);
    }, 0);
    totalDeliveries[facilityId] = facilityTotal;
  });


  /**
   * Example of how the total deliveries now look like.
   *  {BUG066: 1857, BUG067: 1913}
   * They now have key value pairs the key's being the facility_id and the value being the total deliveries
   */

  //Merge the result with facilities.csv using the facility_id to map the IDs to actual facility_name
  const faciliyRecords = facilitiesResult.data;
  //Shape of the mergedFacilities
  const mergedFacilities: {
    facilityId: string;
    facilityName: string;
    totalDeliveries: number;
  }[] = [];

  //Loop through each facility record and create an object where the Key is the facilityId and Value is the facilityName
  faciliyRecords.forEach((facility) => {
    const group = {
      facilityId: facility.facility_id,
      facilityName: facility.facility_name,
    };

    //Create value (total) which has the total values by facility ids
    const total = totalDeliveries[group.facilityId];

    //Shape of the final object of the three records merged
    const facilityWithTotal = {
      facilityId: group.facilityId,
      facilityName: group.facilityName,
      totalDeliveries: total ?? 0,
    };

    //All the merged facilities
    mergedFacilities.push(facilityWithTotal);
  });

  //Sort them in descending order from largest to smallest
  // Descending order makes the first rows immediately usable as a ranking.
  mergedFacilities.sort(
    (facilityA, facilityB) =>
      facilityB.totalDeliveries - facilityA.totalDeliveries,
  );

  return mergedFacilities;
}

function getMaternalHealthIndicators(
  clinicalResult: CsvResult,
  facilitiesResult: CsvResult,
) {
  const groupedFacilities = groupedByFacility(clinicalResult.data);

  const facilityNames = new Map(
    facilitiesResult.data.map((facility) => [
      facility.facility_id,
      facility.facility_name,
    ]),
  );

    // These indicators come from clinical data; facilities.csv only supplies the
    // human-readable name for each facility ID.
  return sumOfIndicators(groupedFacilities).map((indicator) => ({
    ...indicator,
    facilityName: facilityNames.get(indicator.facilityId) ?? "Unknown facility",
    clinicalEffectivenessScore: null,
    criticalReadinessScore: null,
    operationalQualityScore: null,
    overallScore: null,
  }));
}

/**
 *
 * Were going to calculate 3 peformance metrics. 1. Clinical Safety & Survival Index , 2. Critical Readiness & Infrastructure Score 3. Operational Quality & Protocol Compliance Score
 * Clinical Safety measures how well a facility actually saves lives and prevent adverse outcomes relative to its patient volume
 * Critical Readiness and Infrastructure Score measures a facilities physical and technical capacity to handle complicated neonatal cases
 * Operation Quality & Protocol Compliance Score meausres teh standard of care, governance and institutional accountability
 */

function generatePerformanceScores(files: GroupedFiles): QuarterlyHealthBulletinRow[] {

  // Clinical Safety & Survival Index combines clinical outcomes with governance.
  const clinicalFacilities = files["clinical_neonatal.csv"];
  const governanceFacilities = files["governance.csv"];
  const facilityRecords = files["facilities.csv"];
  if (!clinicalFacilities) return [];

  const mortalityRates = sumOfIndicators(clinicalFacilities);
  const facilityNames = new Map(
    Object.values(facilityRecords ?? {})
      .flat()
      .map((facility) => [facility.facility_id, facility.facility_name]),
  );

  return mortalityRates.map((clinical) => {
    // Match the governance row and facility name using the shared facility ID.
    const governance = governanceFacilities?.[clinical.facilityId]?.[0];
    const deathAuditScore = parsePercentage(
      governance?.death_audits_conducted_pct,
    );

    // Lower mortality and stillbirth rates mean a higher survival score.
    /**
     * Suppose:
     * clinical.neonatalMortalityRate === 0.04;
     * clinical.stillBirthsRate === 0.02;
     * First invert each rate:
     * 1 - 0.04 = 0.96
     * 1 - 0.02 = 0.98
     * Lower mortality means better survival, so the rates are subtracted from 1.
     * Then average them:
     * (0.96 + 0.98) / 2 = 0.97
     * Convert to a percentage:
     * 0.97 * 100 = 97
     *  Therefore: survivalScore === 97
     * The weighting means:
     * Clinical survival contributes 70%.
     * Death-audit practice contributes 30%.
     */
    const survivalScore = ((1 - clinical.neonatalMortalityRate + (1 - clinical.stillBirthsRate)) / 2) * 100;
    // Combine survival outcomes with review practice. These weights are the
    // chosen scoring rule and can be adjusted as the metric is refined.
    const clinicalEffectivenessScore =
      survivalScore * 0.7 + deathAuditScore * 0.3;

    return {
      ...clinical,
      facilityName: facilityNames.get(clinical.facilityId) ?? "Unknown facility",
      clinicalEffectivenessScore,
      criticalReadinessScore: null,
      operationalQualityScore: null,
      overallScore: null,
    };
  });
}

function parsePercentage(value: string | undefined) {
  // Return zero when a facility has no governance value to score.
  if (!value) return 0;
  return Number.parseFloat(value.replace("%", ""));
}

function groupedByFacility(facilities: CsvRow[]) {
  // Turn flat monthly rows into facility buckets so records from different
  // facilities are never aggregated together.
  return facilities.reduce<Record<string, CsvRow[]>>((groups, record) => {
    const facilityId = record.facility_id;
    //If its there's a group with no IDs then group it or leave it as an empty array
    if (!groups[facilityId]) groups[facilityId] = [];
    groups[facilityId].push(record);
    return groups;
  }, {});
}

function sumOfIndicators(facilities: Record<string, CsvRow[]>) {
  // Sum counts across months before calculating rates; averaging monthly rates
  // would give months with different volumes equal influence.
  // Each entry is one facility and all of that facility's monthly records.
  const response = Object.entries(facilities).map(
    /**
     *
     * The result here is key, value pairs.
     * { NYA001: [record1, record2], NYA002: [record3, record4]}
     * In our case here the key is the facility id and value are the records under that facility
     */
    ([facilityId, records]) => {
      const totals = records.reduce(
        (acc, record) => {
          acc.totalDeliveries += Number(record.total_deliveries) || 0;
          acc.liveBirths += Number(record.live_births) || 0;
          acc.stillbirths += Number(record.stillbirths) || 0;
          acc.earlyDeaths += Number(record.neonatal_deaths_0_7d) || 0;
          acc.lateDeaths += Number(record.neonatal_deaths_8_28d) || 0;
          acc.asphyxiaDeaths += Number(record.death_birth_asphyxia) || 0;
          acc.prematurityDeaths += Number(record.death_prematurity) || 0;
          acc.sepsisDeaths += Number(record.death_sepsis) || 0;
          return acc;
        },
        {
          totalDeliveries: 0,
          liveBirths: 0,
          stillbirths: 0,
          earlyDeaths: 0,
          lateDeaths: 0,
          asphyxiaDeaths: 0,
          prematurityDeaths: 0,
          sepsisDeaths: 0,
        },
      );

      // Calculate rates only after totals are combined across all months.
      // Return zero when the denominator is zero to avoid NaN or Infinity.
      const stillBirthsRate =
        totals.totalDeliveries === 0
          ? 0
          : totals.stillbirths / totals.totalDeliveries;

      // Neonatal deaths include both early (0-7 days) and late (8-28 days)
      // deaths before calculating the mortality rate.
      const neonatalDeaths = totals.earlyDeaths + totals.lateDeaths;

      const neonatalMortalityRate =
        totals.liveBirths === 0 ? 0 : neonatalDeaths / totals.liveBirths;

      //We calc the rest of the neonatal proportion
      const asphyxiaProportion =
        neonatalDeaths === 0 ? 0 : totals.asphyxiaDeaths / neonatalDeaths;
      const prematurityProportion =
        neonatalDeaths === 0 ? 0 : totals.prematurityDeaths / neonatalDeaths;
      const sepsisProportion =
        neonatalDeaths === 0 ? 0 : totals.sepsisDeaths / neonatalDeaths;

      return {
        facilityId,
        ...totals,
        stillBirthsRate,
        neonatalMortalityRate,
        asphyxiaProportion,
        prematurityProportion,
        sepsisProportion,
      };
    },
  );

  return response;
}
