"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MessagesPage } from "@/lib/types";
import { displayName } from "@/lib/utils";

export function SentView() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MessagesPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api<MessagesPage>(`/messages?page=${page}&pageSize=25`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">Outreach history</h2>
      <p className="mt-1 text-sm text-ink-muted">
        One-to-one emails sent from this app through Gmail.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {!loading && data?.total === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-line bg-paper-raised px-6 py-16 text-center">
          <h2 className="text-base font-semibold">Nothing sent yet</h2>
          <p className="mx-auto mt-2 max-w-md text-ink-muted">
            Open the directory, pick a contact with an email, and send from the
            compose panel. Connect Gmail first if you have not already.
          </p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-paper-raised">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((message) => (
                <tr key={message.id} className="border-t border-line align-top">
                  <td className="px-4 py-3">
                    <div>{message.to}</div>
                    <div className="text-ink-muted">
                      {displayName(message.contact)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{message.subject}</div>
                    {message.attachments?.length > 0 && (
                      <div className="mt-1 text-xs text-ink-muted">
                        {message.attachments
                          .map((file) => file.filename)
                          .join(", ")}
                      </div>
                    )}
                    {message.error && (
                      <div className="mt-1 text-xs text-danger">
                        {message.error}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{message.status}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {new Date(message.sentAt || message.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pageCount > 1 && (
        <div className="mt-4 flex justify-end gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
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
      )}
    </div>
  );
}
