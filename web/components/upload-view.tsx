"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiForm } from "@/lib/api";
import {
  CANONICAL_FIELDS,
  FIELD_LABELS,
  type CanonicalField,
  type ImportPreview,
  type ImportResult,
} from "@/lib/types";

export function UploadView() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, CanonicalField | "">>(
    {},
  );
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const mappedFields = useMemo(() => {
    return new Set(Object.values(mapping).filter(Boolean));
  }, [mapping]);

  async function previewFile(nextFile: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    const form = new FormData();
    form.append("file", nextFile);
    try {
      const data = await apiForm<ImportPreview>("/imports/preview", form);
      setFile(nextFile);
      setPreview(data);
      setMapping(data.mapping);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  async function importFile() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("mapping", JSON.stringify(mapping));
    form.append("mode", mode);
    try {
      const data = await apiForm<ImportResult>("/imports", form);
      setResult(data);
      if (data.googleSheet?.ok) {
        setTimeout(() => router.push("/"), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="text-lg font-semibold tracking-tight">Import dataset</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        CSV or JSON. Map columns onto Job Digger fields. After import, the full
        contact list is written to your Google Sheet. Connect Google in the
        header first, and enable the Sheets API on the same Cloud project.
      </p>

      <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line bg-paper-raised px-6 py-12 text-center hover:bg-paper">
        <span className="font-medium">
          {file ? file.name : "Choose a CSV or JSON file"}
        </span>
        <span className="mt-1 text-sm text-ink-muted">
          Up to 15 MB. Company-only and people lists both work.
        </span>
        <input
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="sr-only"
          onChange={(event) => {
            const next = event.target.files?.[0];
            if (next) void previewFile(next);
          }}
        />
      </label>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {result && (
        <div className="mt-4 space-y-2 rounded-md border border-forest/30 bg-forest/10 px-3 py-2 text-sm">
          <p>
            Imported {result.total} rows ({result.created} new
            {result.updated ? `, ${result.updated} updated` : ""}).
          </p>
          {result.googleSheet?.ok ? (
            <p>
              Saved to{" "}
              <a
                href={result.googleSheet.url}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Google Sheet
              </a>
              . Opening directory…
            </p>
          ) : (
            <p className="text-danger">
              Directory was updated locally, but the Google Sheet was not.{" "}
              {result.googleSheet?.error}{" "}
              {result.googleSheet?.url ? (
                <a
                  href={result.googleSheet.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Open sheet
                </a>
              ) : null}
            </p>
          )}
        </div>
      )}

      {preview && (
        <div className="mt-8 space-y-6">
          <div className="rounded-lg border border-line bg-paper-raised p-5">
            <h2 className="text-sm font-semibold">Column mapping</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {preview.rowCount} rows in {preview.filename}. Adjust anything the
              auto-detect got wrong.
            </p>
            <div className="mt-4 divide-y divide-line">
              {preview.headers.map((header) => (
                <div
                  key={header}
                  className="grid gap-2 py-3 sm:grid-cols-[1fr_16rem] sm:items-center"
                >
                  <div>
                    <div className="font-medium">{header}</div>
                    <div className="truncate text-xs text-ink-muted">
                      e.g.{" "}
                      {String(preview.sampleRows[0]?.[header] ?? "empty")}
                    </div>
                  </div>
                  <select
                    value={mapping[header] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value as CanonicalField | "";
                      setMapping((current) => {
                        const next = { ...current };
                        if (value) {
                          for (const [key, mapped] of Object.entries(next)) {
                            if (mapped === value) next[key] = "";
                          }
                        }
                        next[header] = value;
                        return next;
                      });
                    }}
                    className="rounded-md border border-line bg-paper px-3 py-2 text-sm"
                  >
                    <option value="">{FIELD_LABELS[""]}</option>
                    {CANONICAL_FIELDS.map((field) => (
                      <option
                        key={field}
                        value={field}
                        disabled={
                          mappedFields.has(field) && mapping[header] !== field
                        }
                      >
                        {FIELD_LABELS[field]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-paper-raised p-5">
            <label className="grid gap-1 text-sm">
              <span className="text-ink-muted">Import mode</span>
              <select
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as "replace" | "merge")
                }
                className="rounded-md border border-line bg-paper px-3 py-2"
              >
                <option value="replace">Replace existing contacts</option>
                <option value="merge">Merge with existing contacts</option>
              </select>
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={importFile}
              className="rounded-md bg-forest px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-50"
            >
              {busy ? "Working…" : "Import dataset"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
