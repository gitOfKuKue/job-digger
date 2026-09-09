"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { AttachmentPicker } from "@/components/attachment-picker";
import { RichTextEditor } from "@/components/rich-text-editor";
import { api, apiFile, apiForm } from "@/lib/api";
import { takeFiles } from "@/lib/attachments";
import { isEmptyHtml } from "@/lib/html";
import { OUTREACH_TEMPLATES } from "@/lib/templates";
import type { AuthMe, Contact, OutreachTemplate } from "@/lib/types";
import { displayName, interpolate } from "@/lib/utils";

type Props = {
  contact: Contact;
  auth: AuthMe | null;
  onClose: () => void;
  onSent: () => void;
};

export function ComposePanel({ contact, auth, onClose, onSent }: Props) {
  const values = useMemo(
    () => ({
      name: contact.name || contact.company || "",
      title: contact.title || "",
      company: contact.company || "",
    }),
    [contact.name, contact.company, contact.title],
  );

  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<OutreachTemplate[]>(
    OUTREACH_TEMPLATES,
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void api<OutreachTemplate[]>("/templates")
      .then((items) => {
        if (items.length) {
          setTemplates(items);
          setTemplateId((current) => current || items[0].id);
        } else {
          setTemplateId((current) => current || OUTREACH_TEMPLATES[0].id);
        }
      })
      .catch(() => {
        setTemplateId((current) => current || OUTREACH_TEMPLATES[0].id);
      });
  }, []);

  useEffect(() => {
    const template =
      templates.find((item) => item.id === templateId) || templates[0];
    if (!template) return;
    setSubject(interpolate(template.subject, values));
    setBody(interpolate(template.body, values));
    setError(null);
  }, [contact.id, templateId, templates, values]);

  useEffect(() => {
    const template =
      templates.find((item) => item.id === templateId) || templates[0];
    const attachments = template?.attachments ?? [];
    let cancelled = false;
    if (!template || attachments.length === 0) {
      setFiles([]);
      return;
    }
    void Promise.all(
      attachments.map((file) =>
        apiFile(
          `/templates/${template.id}/files/${file.id}`,
          file.filename,
          file.contentType,
        ),
      ),
    )
      .then((next) => {
        if (!cancelled) setFiles(next);
      })
      .catch(() => {
        if (!cancelled) setFiles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [contact.id, templateId, templates]);

  const canSend = Boolean(contact.email && auth?.user);

  function addFiles(list: FileList | File[] | null) {
    const incoming = list ? Array.from(list) : [];
    if (!incoming.length) return;
    const { accepted, error: nextError } = takeFiles(incoming, files);
    setError(nextError);
    if (accepted.length) {
      setFiles((current) => [...current, ...accepted]);
    }
  }

  function removeFile(key: string) {
    setFiles((current) =>
      current.filter(
        (file, index) => `${file.name}-${file.lastModified}-${index}` !== key,
      ),
    );
  }

  async function send() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("contactId", contact.id);
      form.append("subject", subject);
      form.append("body", body);
      for (const file of files) {
        form.append("attachments", file);
      }
      await apiForm("/messages", form);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <aside className="grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)_auto] bg-paper-raised">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-muted">
            Compose
          </p>
          <h2 className="text-base font-semibold">{displayName(contact)}</h2>
          <p className="text-sm text-ink-muted">
            {contact.title ? `${contact.title} · ` : ""}
            {contact.company}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-ink-muted hover:bg-paper hover:text-ink"
          aria-label="Close compose"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 px-5 py-4">
        <div className="grid gap-3">
          {!contact.email && (
            <div className="rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm">
              This row has no email. Send is disabled until the dataset includes
              one.
            </div>
          )}
          {contact.email && !auth?.user && (
            <div className="rounded-md border border-line bg-paper px-3 py-2 text-sm">
              {auth?.googleConfigured
                ? "Connect Gmail in the header to send from your inbox."
                : "Gmail is not configured. Add Google OAuth credentials to api/.env."}
            </div>
          )}

          <label className="grid gap-1 text-sm">
            <span className="text-ink-muted">Template</span>
            <select
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              className="rounded-md border border-line bg-paper px-3 py-2"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-ink-muted">To</span>
            <input
              readOnly
              value={contact.email || "No email on this contact"}
              className="rounded-md border border-line bg-paper px-3 py-2 text-ink-muted"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-ink-muted">Subject</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="rounded-md border border-line bg-paper px-3 py-2"
            />
          </label>
        </div>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-1 text-sm">
          <span className="text-ink-muted">Body</span>
          <div className="h-full min-h-0">
            <RichTextEditor
              fill
              value={body}
              onChange={setBody}
              disabled={sending}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-line px-5 py-3">
        <AttachmentPicker
          items={files.map((file, index) => ({
            key: `${file.name}-${file.lastModified}-${index}`,
            name: file.name,
            size: file.size,
            type: file.type,
          }))}
          onAddFiles={addFiles}
          onRemove={removeFile}
          disabled={sending}
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <button
          type="button"
          disabled={!canSend || sending || !subject.trim() || isEmptyHtml(body)}
          onClick={() => void send()}
          className="mt-3 w-full rounded-md bg-forest px-3 py-2.5 text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send email"}
        </button>
      </div>
    </aside>
  );
}
