"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useDirectoryFilters } from "@/lib/directory-filters-context";
import type { Contact, ContactsPage, Facets } from "@/lib/types";
import { displayName } from "@/lib/utils";
import { ComposePanel } from "./compose-panel";

export function DirectoryView() {
  const { auth } = useAuth();
  const { filters, page, setPage, facets, setFacets } = useDirectoryFilters();
  const [data, setData] = useState<ContactsPage | null>(null);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sentFlash, setSentFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.title) params.set("title", filters.title);
    if (filters.company) params.set("company", filters.company);
    if (filters.location) params.set("location", filters.location);
    if (filters.industry) params.set("industry", filters.industry);
    if (filters.hasEmail) params.set("hasEmail", "true");
    params.set("page", String(page));
    params.set("pageSize", "25");
    try {
      const [contacts, nextFacets] = await Promise.all([
        api<ContactsPage>(`/contacts?${params.toString()}`),
        api<Facets>("/contacts/facets"),
      ]);
      setData(contacts);
      setFacets(nextFacets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load contacts.");
    } finally {
      setLoading(false);
    }
  }, [filters, page, setFacets]);

  useEffect(() => {
    load();
  }, [load]);

  const emptyDataset = facets?.total === 0;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
      <section className="min-w-0">
        {sentFlash && (
          <p className="mb-4 rounded-md border border-forest/30 bg-forest/10 px-3 py-2 text-sm">
            {sentFlash}
          </p>
        )}

        {emptyDataset ? (
          <div className="rounded-lg border border-dashed border-line bg-paper-raised px-6 py-16 text-center">
            <h2 className="text-base font-semibold">No dataset yet</h2>
            <p className="mx-auto mt-2 max-w-md text-ink-muted">
              Upload a CSV or JSON file of companies or people. Job Digger will
              map columns, then you can filter and email from here.
            </p>
            <Link
              href="/upload"
              className="mt-6 inline-flex rounded-md bg-forest px-4 py-2 text-sm font-medium text-paper"
            >
              Upload dataset
            </Link>
          </div>
        ) : (
          <>
            {facets && facets.total > 0 && (
              <div className="mb-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border border-line bg-paper-raised px-2 py-1 text-ink-muted">
                  {data?.total ?? facets.total} shown
                </span>
                <span className="rounded-md border border-line bg-paper-raised px-2 py-1 text-ink-muted">
                  {facets.withEmail} email
                </span>
              </div>
            )}

            {error && <p className="mb-3 text-sm text-danger">{error}</p>}

            <div className="overflow-hidden rounded-lg border border-line bg-paper-raised">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Other</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-ink-muted"
                      >
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && data?.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-ink-muted"
                      >
                        No contacts match these filters.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    data?.items.map((contact) => (
                      <tr
                        key={contact.id}
                        onClick={() => setSelected(contact)}
                        className={`cursor-pointer border-t border-line hover:bg-paper ${
                          selected?.id === contact.id ? "bg-forest/10" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {displayName(contact)}
                          </div>
                          <div className="text-ink-muted">{contact.company}</div>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {contact.title || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {contact.email || (
                            <span className="text-ink-muted">No email</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {[contact.phone, contact.location]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {data && data.pageCount > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-ink-muted">
                  Page {data.page} of {data.pageCount} · {data.total} matches
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= data.pageCount}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {selected ? (
        <div className="flex h-[calc(100vh-8rem)] min-h-[32rem] w-full self-start overflow-hidden rounded-lg border border-line lg:sticky lg:top-0">
          <ComposePanel
            contact={selected}
            auth={auth}
            onClose={() => setSelected(null)}
            onSent={() => {
              setSentFlash(`Email queued to ${selected.email}.`);
              setSelected(null);
            }}
          />
        </div>
      ) : (
        <aside className="hidden rounded-lg border border-dashed border-line bg-paper-raised px-6 py-16 text-center text-sm text-ink-muted lg:block">
          Select a contact to compose an email.
        </aside>
      )}
    </div>
  );
}
