"use client";

import { useState } from "react";
import { Paperclip, X } from "lucide-react";
import { MAX_FILES } from "@/lib/attachments";
import { formatBytes } from "@/lib/utils";

export type AttachmentPickerItem = {
  key: string;
  name: string;
  size: number;
  type?: string;
};

type Props = {
  items: AttachmentPickerItem[];
  onAddFiles: (list: FileList | File[] | null) => void;
  onRemove: (key: string) => void;
  disabled?: boolean;
  hint?: string;
};

export function AttachmentPicker({
  items,
  onAddFiles,
  onRemove,
  disabled,
  hint = "Any file type. Drop files here or browse. Up to 5 files, 10 MB each.",
}: Props) {
  const [dropping, setDropping] = useState(false);

  return (
    <div
      className={`rounded-md border px-3 py-2.5 ${
        dropping ? "border-forest bg-paper-raised" : "border-line bg-paper"
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDropping(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setDropping(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDropping(false);
        if (!disabled) onAddFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-ink-muted">
          Attachments
          {items.length > 0 ? ` (${items.length})` : ""}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs hover:bg-paper-raised has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40">
          <Paperclip className="h-3.5 w-3.5" />
          Add files
          <input
            type="file"
            multiple
            disabled={disabled || items.length >= MAX_FILES}
            className="sr-only"
            onChange={(event) => {
              onAddFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {items.length > 0 ? (
        <ul className="mt-2 max-h-28 space-y-1.5 overflow-y-auto">
          {items.map((file) => (
            <li
              key={file.key}
              className="flex items-center justify-between gap-2 rounded-md border border-line bg-paper-raised px-2.5 py-1.5 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate">{file.name}</p>
                <p className="text-xs text-ink-muted">
                  {formatBytes(file.size)}
                  {file.type ? ` · ${file.type}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(file.key)}
                disabled={disabled}
                className="rounded-md p-1 text-ink-muted hover:bg-paper hover:text-ink disabled:opacity-40"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      )}
    </div>
  );
}
