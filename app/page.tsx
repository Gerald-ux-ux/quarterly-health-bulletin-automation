/**
 * This is a client file in Next.JS becuase it runs in the browser allowing it to handle live user interaction.
 */

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  CsvResult,
  CsvRow,
  handleGenerate,
} from "./services/process-csv";
import { FileUploader } from "react-drag-drop-files";

export default function Home() {
  // This page owns the upload interaction, so the selected files and UI state
  // need to live in the browser rather than on the server.
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  function handleFileChange(selectedFiles: File | File[] | FileList) {
    setError("");

    // The uploader can return different collection shapes. Normalize them to
    // File[] once so parsing and rendering can use one predictable structure.
    if (selectedFiles instanceof FileList) {
      setFiles(Array.from(selectedFiles));
      return;
    }

    setFiles(Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles]);
  }

  async function handleGenerateMetric() {
    setError("");
    setIsGenerating(true);

    // For this prototype, filenames are the contract that identifies each
    // dataset. With the six-week constraint, exact-name validation is a clear
    // and inexpensive safeguard. A later phase could inspect headers and
    // validate schemas so equivalent files could use different names.
    const requiredFiles = [
      "clinical_neonatal.csv",
      "facilities.csv",
      "governance.csv",
    ];
    const selectedFileNames = new Set(files.map((file) => file.name));
    const missingFiles = requiredFiles.filter(
      (fileName) => !selectedFileNames.has(fileName),
    );

    if (missingFiles.length > 0) {
      setError(`Missing required file(s): ${missingFiles.join(", ")}`);
      setIsGenerating(false);
      return;
    }

    try {
      // Parse files concurrently because each CSV is independent. Promise.all
      // ensures the report is generated only after every file is available.
      const results = await Promise.all(
        files.map(
          (file) =>
            new Promise<CsvResult>((resolve, reject) => {
              Papa.parse<CsvRow>(file, {
                header: true,
                complete: (result) => {
                  // Keep the original filename beside Papa Parse's result so
                  // the service can route each dataset to the right calculation.
                  resolve({ fileName: file.name, ...result });
                },
                error: reject,
              });
            }),
        ),
      );

      const report = handleGenerate(results);
      // sessionStorage is sufficient for this browser-only handoff between
      // the upload page and /results; the raw CSV files do not need uploading
      // to a server for this prototype.
      sessionStorage.setItem("quarterly-health-bulletin", JSON.stringify(report));
      router.push("/results");
    } catch {
      // Keep parsing failures visible to the user instead of navigating to an
      // incomplete report.
      setError("The files could not be parsed. Please check the CSV files and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="bg-[#F5F1EA] flex flex-col items-center justify-center flex-1 px-6">
        <p className="mb-6 max-w-2xl text-center text-3xl font-semibold leading-tight tracking-tight text-[#0A0A0A]">
          Upload D-H-I-S-2 report to generate your Quarterly Health Bulletin
        </p>
      <div className="flex flex-col gap-4">

        <div className="flex items-center justify-between gap-2">
          <FileUploader
            classes="file-uploader"
            handleChange={handleFileChange}
            hoverTitle="Drop files"
            multiple
            name="file"
            required
            types={["CSV"]}
          >
            <span>
              {files.length === 0
                ? "Choose CSV files to upload"
                : `${files.length} file${files.length === 1 ? "" : "s"} selected`}
            </span>
          </FileUploader>

          <button
            className="text-[#F5F1EA] p-2.5 rounded-lg bg-[#0A0A0A]"
            onClick={handleGenerateMetric}
            disabled={files.length === 0 || isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate Metrics"}
          </button>
        </div>

        {files.length > 0 && (
          <div className="flex gap-2 p-4 border rounded-xl border-dashed border-[#0A0A0A]">
            <ul className="text-[#0A0A0A]">
              {files.map((file) => (
                <li className="p-1" key={`${file.name}-${file.lastModified}`}>
                  {file.name[0].toUpperCase() + file.name.slice(1)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-red-700">{error}</p>}

      </div>
    </div>
  );
}
