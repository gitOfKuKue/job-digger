"use client";

import { Paperclip } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AttachmentPicker } from "@/components/attachment-picker";
import { RichTextEditor } from "@/components/rich-text-editor";
import { api, apiUrl } from "@/lib/api";
import { takeFiles } from "@/lib/attachments";
import { isEmptyHtml } from "@/lib/html";
import { useAuth } from "@/lib/auth-context";
import { useDirectoryFilters } from "@/lib/directory-filters-context";
import type {
  BulkSendResult,
  ContactsPage,
  OutreachTemplate,
  TemplateAttachment,
} from "@/lib/types";
import { displayName } from "@/lib/utils";

const EMPTY_TEMPLATE = {
  name: "",
  subject: "",
  body: "",
};

export function TemplatesView() {
  const { auth } = useAuth();
  const { filters } = useDirectoryFilters();
  const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [draft, setDraft] = useState(EMPTY_TEMPLATE);
  const [savedFiles, setSavedFiles] = useState<TemplateAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<ContactsPage | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkSendResult | null>(null);

  const loadTemplates = useCallback(async () => {
    const items = await api<OutreachTemplate[]>("/templates");
    setTemplates(items);
    return items;
  }, []);

  useEffect(() => {
    void loadTemplates()
      .then((items) => {
        if (items[0]) {
          setSelectedId(items[0].id);
          setDraft({
            name: items[0].name,
            subject: items[0].subject,
            body: items[0].body,
          });
          setSavedFiles(items[0].attachments || []);
          setPendingFiles([]);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load templates.");
      });
  }, [loadTemplates]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.title) params.set("title", filters.title);
    if (filters.company) params.set("company", filters.company);
    if (filters.location) params.set("location", filters.location);
    if (filters.industry) params.set("industry", filters.industry);
    params.set("hasEmail", "true");
    params.set("page", "1");
    params.set("pageSize", "100");
    void api<ContactsPage>(`/contacts?${params.toString()}`)
      .then(setRecipients)
      .catch(() => setRecipients(null));
  }, [filters]);

  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) || null,
    [templates, selectedId],
  );

  function applyTemplate(template: OutreachTemplate) {
    setSelectedId(template.id);
    setDraft({
      name: template.name,
      subject: template.subject,
      body: template.body,
    });
    setSavedFiles(template.attachments || []);
    setPendingFiles([]);
  }

  function selectTemplate(template: OutreachTemplate) {
    applyTemplate(template);
    setError(null);
    setNotice(null);
    setBulkResult(null);
  }

  function startNew() {
    setSelectedId("new");
    setDraft(EMPTY_TEMPLATE);
    setSavedFiles([]);
    setPendingFiles([]);
    setError(null);
    setNotice(null);
    setBulkResult(null);
  }

  function addFiles(list: FileList | File[] | null) {
    const incoming = list ? Array.from(list) : [];
    if (!incoming.length) return;
    const { accepted, error: nextError } = takeFiles(incoming, [
      ...savedFiles.map((file) => ({ name: file.filename, size: file.size })),
      ...pendingFiles,
    ]);
    setError(nextError);
    if (accepted.length) {
      setPendingFiles((current) => [...current, ...accepted]);
    }
  }

  function removeFile(key: string) {
    if (key.startsWith("saved:")) {
      const id = key.slice("saved:".length);
      setSavedFiles((current) => current.filter((file) => file.id !== id));
      return;
    }
    setPendingFiles((current) =>
      current.filter(
        (file, index) => `pending:${file.name}-${file.lastModified}-${index}` !== key,
      ),
    );
  }

  function buildForm() {
    const form = new FormData();
    form.append("name", draft.name);
    form.append("subject", draft.subject);
    form.append("body", draft.body);
    form.append(
      "keepAttachmentIds",
      JSON.stringify(savedFiles.map((file) => file.id)),
    );
    for (const file of pendingFiles) {
      form.append("attachments", file);
    }
    return form;
  }

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (selectedId === "new") {
        const created = await api<OutreachTemplate>("/templates", {
          method: "POST",
          body: buildForm(),
        });
        const items = await loadTemplates();
        const next = items.find((item) => item.id === created.id) || created;
        applyTemplate(next);
        setNotice("Template saved.");
      } else {
        await api(`/templates/${selectedId}`, {
          method: "PATCH",
          body: buildForm(),
        });
        const items = await loadTemplates();
        const next = items.find((item) => item.id === selectedId);
        if (next) applyTemplate(next);
        setNotice("Template updated.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save template.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (selectedId === "new") {
      startNew();
      return;
    }
    if (!window.confirm("Delete this template?")) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/templates/${selectedId}`, { method: "DELETE" });
      const items = await loadTemplates();
      if (items[0]) selectTemplate(items[0]);
      else startNew();
      setNotice("Template deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete template.");
    } finally {
      setSaving(false);
    }
  }

  async function sendBulk() {
    if (selectedId === "new") {
      setError("Save the template before sending.");
      return;
    }
    const count = recipients?.total || 0;
    if (!count) {
      setError("No contacts with email match the current Directory filters.");
      return;
    }
    if (
      !window.confirm(
        `Send “${draft.name || "this template"}” to ${Math.min(count, 100)} contact${count === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }
    setSending(true);
    setError(null);
    setNotice(null);
    setBulkResult(null);
    try {
      const result = await api<BulkSendResult>("/messages/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedId,
          q: filters.q || undefined,
          title: filters.title || undefined,
          company: filters.company || undefined,
          location: filters.location || undefined,
          industry: filters.industry || undefined,
        }),
      });
      setBulkResult(result);
      setNotice(
        `Sent ${result.sent} of ${result.total}${result.failed ? `, ${result.failed} failed` : ""}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk send failed.");
    } finally {
      setSending(false);
    }
  }

  const recipientCount = recipients?.total ?? 0;
  const preview = recipients?.items.slice(0, 6) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)_minmax(18rem,22rem)]">
      <aside className="rounded-lg border border-line bg-paper-raised p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Templates</h2>
          <button
            type="button"
            onClick={startNew}
            className="rounded-md border border-line px-2 py-1 text-xs hover:bg-paper"
          >
            New
          </button>
        </div>
        <ul className="space-y-1">
          {templates.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => selectTemplate(template)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm ${
                  selectedId === template.id
                    ? "bg-forest text-paper"
                    : "text-ink-muted hover:bg-paper hover:text-ink"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{template.name}</span>
                {(template.attachments?.length || 0) > 0 && (
                  <Paperclip
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedId === template.id ? "text-paper" : "text-ink-muted"
                    }`}
                  />
                )}
              </button>
            </li>
          ))}
          {selectedId === "new" && (
            <li className="rounded-md bg-paper px-2.5 py-2 text-sm text-ink-muted">
              New template
            </li>
          )}
        </ul>
      </aside>

      <section className="rounded-lg border border-line bg-paper-raised p-5">
        <h2 className="text-base font-semibold">
          {selectedId === "new" ? "New template" : selected?.name || "Template"}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Use {"{{name}}"}, {"{{title}}"}, and {"{{company}}"} — they fill in per
          contact when you send.
        </p>

        <label className="mt-4 grid gap-1 text-sm">
          <span className="text-ink-muted">Name</span>
          <input
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            className="rounded-md border border-line bg-paper px-3 py-2"
          />
        </label>
        <label className="mt-3 grid gap-1 text-sm">
          <span className="text-ink-muted">Subject</span>
          <input
            value={draft.subject}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                subject: event.target.value,
              }))
            }
            className="rounded-md border border-line bg-paper px-3 py-2"
          />
        </label>
        <div className="mt-3 grid gap-1 text-sm">
          <span className="text-ink-muted">Body</span>
          <RichTextEditor
            value={draft.body}
            onChange={(body) =>
              setDraft((current) => ({ ...current, body }))
            }
            disabled={saving}
          />
        </div>

        <div className="mt-3">
          <AttachmentPicker
            items={[
              ...savedFiles.map((file) => ({
                key: `saved:${file.id}`,
                name: file.filename,
                size: file.size,
                type: file.contentType,
              })),
              ...pendingFiles.map((file, index) => ({
                key: `pending:${file.name}-${file.lastModified}-${index}`,
                name: file.name,
                size: file.size,
                type: file.type,
              })),
            ]}
            onAddFiles={addFiles}
            onRemove={removeFile}
            disabled={saving}
            hint="Any file type. Drop files here or browse. Up to 5 files, 10 MB each. Save the template to keep them for bulk send and compose."
          />
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {notice && <p className="mt-3 text-sm">{notice}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={saving || !draft.name.trim()}
            onClick={() => void save()}
            className="rounded-md bg-forest px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
          >
            {saving ? "Saving…" : selectedId === "new" ? "Create" : "Save"}
          </button>
          {selectedId !== "new" && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void remove()}
              className="rounded-md border border-line px-4 py-2 text-sm"
            >
              Delete
            </button>
          )}
        </div>
      </section>

      <aside className="rounded-lg border border-line bg-paper-raised p-5">
        <h2 className="text-sm font-semibold">Bulk send</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Sends this template to Directory matches that have an email. Set
          filters under Directory first. Up to 100 at once. Saved attachments
          go with every email.
        </p>

        <p className="mt-4 text-sm">
          {recipientCount} contact{recipientCount === 1 ? "" : "s"} with email
        </p>
        {preview.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-ink-muted">
            {preview.map((contact) => (
              <li key={contact.id} className="truncate">
                {displayName(contact)}
                {contact.email ? ` · ${contact.email}` : ""}
              </li>
            ))}
            {recipientCount > preview.length && (
              <li>and {recipientCount - preview.length} more</li>
            )}
          </ul>
        )}

        {!auth?.user && (
          <p className="mt-3 text-sm text-ink-muted">
            {auth?.googleConfigured ? (
              <a href={apiUrl("/auth/google")} className="underline">
                Connect Gmail
              </a>
            ) : (
              "Add Google OAuth credentials to send."
            )}{" "}
            before bulk send.
          </p>
        )}

        <button
          type="button"
          disabled={
            sending ||
            selectedId === "new" ||
            !auth?.user ||
            recipientCount === 0 ||
            !draft.subject.trim() ||
            isEmptyHtml(draft.body)
          }
          onClick={() => void sendBulk()}
          className="mt-4 w-full rounded-md bg-forest px-3 py-2.5 text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send to all matches"}
        </button>

        {bulkResult && bulkResult.failed > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-danger">
            {bulkResult.results
              .filter((item) => item.status === "failed")
              .slice(0, 8)
              .map((item) => (
                <li key={item.contactId}>
                  {item.to}: {item.error}
                </li>
              ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
