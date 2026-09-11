"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import Papa from "papaparse";
import {
  BulletinReport,
  QuarterlyHealthBulletinRow,
} from "../services/process-csv";

const reportStorageKey = "quarterly-health-bulletin";

function formatRate(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadTopFacilities(report: BulletinReport) {
  downloadCsv(
    "top-facilities.csv",
    report.topFacilities.map((facility) => ({
      facilityId: facility.facilityId,
      facilityName: facility.facilityName,
      totalDeliveries: facility.totalDeliveries,
    })),
  );
}

function downloadMaternalIndicators(report: BulletinReport) {
  downloadCsv(
    "maternal-newborn-indicators.csv",
    report.maternalIndicators.map((facility) => ({
      facilityId: facility.facilityId,
      facilityName: facility.facilityName,
      totalDeliveries: facility.totalDeliveries,
      liveBirths: facility.liveBirths,
      stillbirths: facility.stillbirths,
      earlyDeaths: facility.earlyDeaths,
      lateDeaths: facility.lateDeaths,
      stillBirthsRate: formatRate(facility.stillBirthsRate),
      neonatalMortalityRate: formatRate(facility.neonatalMortalityRate),
      asphyxiaProportion: formatRate(facility.asphyxiaProportion),
      prematurityProportion: formatRate(facility.prematurityProportion),
      sepsisProportion: formatRate(facility.sepsisProportion),
    })),
  );
}

function downloadPerformanceScores(report: BulletinReport) {
  downloadCsv(
    "performance-scores.csv",
    report.performanceScores.map((facility) => ({
      facilityId: facility.facilityId,
      facilityName: facility.facilityName,
      clinicalEffectivenessScore: facility.clinicalEffectivenessScore ?? "",
      criticalReadinessScore: facility.criticalReadinessScore ?? "",
      operationalQualityScore: facility.operationalQualityScore ?? "",
      overallScore: facility.overallScore ?? "",
    })),
  );
}

function FacilityLabel({ facility }: { facility: QuarterlyHealthBulletinRow }) {
  return (
    <div>
      <div className="font-medium">{facility.facilityName}</div>
      <div className="text-xs text-[#0A0A0A]/60">{facility.facilityId}</div>
    </div>
  );
}

function MetricTable({
  rows,
  kind,
}: {
  rows: QuarterlyHealthBulletinRow[];
  kind: "top" | "indicators" | "performance";
}) {
  return (
    <div className="max-h-112 overflow-auto border border-[#0A0A0A] rounded-xl">
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 border-b border-[#0A0A0A] bg-[#0A0A0A] text-[#F5F1EA]">
          <tr>
            <th className="p-3">Facility</th>
            {kind === "top" && <th className="p-3">Total deliveries</th>}
            {kind === "indicators" && (
              <>
                <th className="p-3">Stillbirth rate</th>
                <th className="p-3">Neonatal mortality</th>
                <th className="p-3">Asphyxia</th>
                <th className="p-3">Prematurity</th>
                <th className="p-3">Sepsis</th>
              </>
            )}
            {kind === "performance" && (
              <>
                <th className="p-3">Clinical effectiveness</th>
                <th className="p-3">Readiness</th>
                <th className="p-3">Operations</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((facility) => (
            <tr
              className="border-b border-[#0A0A0A]/20"
              key={facility.facilityId}
            >
              <td className="p-3">
                <FacilityLabel facility={facility} />
              </td>
              {kind === "top" && (
                <td className="p-3">
                  {facility.totalDeliveries?.toLocaleString()}
                </td>
              )}
              {kind === "indicators" && (
                <>
                  <td className="p-3">{formatRate(facility.stillBirthsRate)}</td>
                  <td className="p-3">
                    {formatRate(facility.neonatalMortalityRate)}
                  </td>
                  <td className="p-3">
                    {formatRate(facility.asphyxiaProportion)}
                  </td>
                  <td className="p-3">
                    {formatRate(facility.prematurityProportion)}
                  </td>
                  <td className="p-3">{formatRate(facility.sepsisProportion)}</td>
                </>
              )}
              {kind === "performance" && (
                <>
                  <td className="p-3">
                    {facility.clinicalEffectivenessScore === null
                      ? "-"
                      : facility.clinicalEffectivenessScore.toFixed(1)}
                  </td>
                  {/* These metrics are intentionally deferred while the prototype focuses on one deeply implemented score. */}
                  <td className="p-3">
                    Coming soon
                  </td>
                  <td className="p-3">Coming soon</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ResultsPage() {
  const [report, setReport] = useState<BulletinReport | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    startTransition(() => {
      const storedReport = window.sessionStorage.getItem(reportStorageKey);
      setReport(storedReport ? (JSON.parse(storedReport) as BulletinReport) : null);
      setIsHydrated(true);
    });
  }, []);

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[#F5F1EA] p-8 text-[#0A0A0A]">
        <p>Loading bulletin results...</p>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-[#F5F1EA] p-8 text-[#0A0A0A]">
        <h1 className="text-2xl font-semibold">No bulletin results yet</h1>
        <p className="mt-2">Upload the required CSV files to generate a report.</p>
        <Link className="mt-4 inline-block underline" href="/">
          Return to upload
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F1EA] p-8 text-[#0A0A0A]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide">Quarterly Health Bulletin</p>
            <h1 className="text-3xl font-semibold">Bulletin metrics</h1>
            <p className="mt-1">{report.maternalIndicators.length} facilities analyzed</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg bg-[#0A0A0A] px-4 py-2 text-[#F5F1EA]"
              onClick={() => downloadTopFacilities(report)}
            >
              Top facilities CSV
            </button>
            <button
              className="rounded-lg bg-[#0A0A0A] px-4 py-2 text-[#F5F1EA]"
              onClick={() => downloadMaternalIndicators(report)}
            >
              Indicators CSV
            </button>
            <button
              className="rounded-lg bg-[#0A0A0A] px-4 py-2 text-[#F5F1EA]"
              onClick={() => downloadPerformanceScores(report)}
            >
              Performance CSV
            </button>
            <Link className="rounded-lg border border-[#0A0A0A] px-4 py-2" href="/">
              Upload new files
            </Link>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-semibold">1. Top Facilities</h2>
            <p>Facilities ranked by total deliveries across reporting months.</p>
          </div>
          <MetricTable rows={report.topFacilities} kind="top" />
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-semibold">2. Maternal &amp; Newborn Indicators</h2>
            <p>Outcome rates and cause-specific mortality proportions by facility.</p>
          </div>
          <MetricTable rows={report.maternalIndicators} kind="indicators" />
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-semibold">3. Performance Score</h2>
            <p>
              Clinical effectiveness is implemented first. Readiness and
              operations are marked Coming soon because of the project time
              constraint and are planned as the next scoring phase.
            </p>
            <p className="max-w-4xl text-sm text-[#0A0A0A]/70">
              This deliberate focus delivers one high-impact metric in depth:
              it combines patient outcomes, including neonatal mortality and
              stillbirth rates, with institutional safety controls such as
              death audits. The result captures both performance and
              accountability in one score.
            </p>
          </div>
          <MetricTable rows={report.performanceScores} kind="performance" />
        </section>
      </div>
    </main>
  );
}
