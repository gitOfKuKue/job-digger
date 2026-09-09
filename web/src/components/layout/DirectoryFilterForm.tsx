"use client";

import { useDirectoryFilters } from "@/lib/directory-filters-context";

type Props = {
  onApplied?: () => void;
};

export function DirectoryFilterForm({ onApplied }: Props) {
  const { draft, setDraft, apply, reset, facets } = useDirectoryFilters();
  const showTitle = Boolean(facets?.fields.title?.populated);
  const showCompany = Boolean(facets?.fields.company?.populated);
  const showLocation = Boolean(facets?.fields.location?.populated);
  const showIndustry = Boolean(facets?.fields.industry?.populated);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply();
        onApplied?.();
      }}
      className="mt-1 space-y-2.5 rounded-md border border-line bg-paper px-2.5 py-2.5"
    >
      <label className="grid gap-1 text-xs">
        <span className="text-ink-muted">Search</span>
        <input
          value={draft.q}
          onChange={(event) =>
            setDraft((current) => ({ ...current, q: event.target.value }))
          }
          placeholder="Name, company, title…"
          className="rounded-md border border-line bg-paper-raised px-2 py-1.5 text-sm"
        />
      </label>
      {showTitle && (
        <label className="grid gap-1 text-xs">
          <span className="text-ink-muted">Job title</span>
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="Contains…"
            className="rounded-md border border-line bg-paper-raised px-2 py-1.5 text-sm"
          />
        </label>
      )}
      {showCompany && (
        <label className="grid gap-1 text-xs">
          <span className="text-ink-muted">Company</span>
          <input
            value={draft.company}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                company: event.target.value,
              }))
            }
            className="rounded-md border border-line bg-paper-raised px-2 py-1.5 text-sm"
          />
        </label>
      )}
      {showLocation && (
        <label className="grid gap-1 text-xs">
          <span className="text-ink-muted">Location</span>
          <input
            value={draft.location}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
            className="rounded-md border border-line bg-paper-raised px-2 py-1.5 text-sm"
          />
        </label>
      )}
      {showIndustry && (
        <label className="grid gap-1 text-xs">
          <span className="text-ink-muted">Industry / services</span>
          <input
            value={draft.industry}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                industry: event.target.value,
              }))
            }
            className="rounded-md border border-line bg-paper-raised px-2 py-1.5 text-sm"
          />
        </label>
      )}
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={draft.hasEmail}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              hasEmail: event.target.checked,
            }))
          }
        />
        Has email
      </label>
      <div className="flex gap-1.5 pt-0.5">
        <button
          type="submit"
          className="flex-1 rounded-md bg-forest px-2 py-1.5 text-xs font-medium text-paper"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-line px-2 py-1.5 text-xs"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
