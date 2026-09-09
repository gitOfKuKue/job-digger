"use client";

import { useEffect, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { toEditorHtml } from "@/lib/html";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  fill?: boolean;
  placeholder?: string;
};

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "rounded-md p-1.5 text-ink-muted hover:bg-paper hover:text-ink disabled:opacity-40",
        active && "bg-paper text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, disabled }: { editor: Editor; disabled?: boolean }) {
  const off = disabled || !editor.isEditable;

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-paper-raised px-1.5 py-1">
      <ToolButton
        label="Undo"
        disabled={off || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Redo"
        disabled={off || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </ToolButton>
      <span className="mx-1 h-4 w-px bg-line" />
      <ToolButton
        label="Bold"
        active={editor.isActive("bold")}
        disabled={off}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Italic"
        active={editor.isActive("italic")}
        disabled={off}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Underline"
        active={editor.isActive("underline")}
        disabled={off}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        disabled={off}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolButton>
      <span className="mx-1 h-4 w-px bg-line" />
      <ToolButton
        label="Heading"
        active={editor.isActive("heading", { level: 2 })}
        disabled={off}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Subheading"
        active={editor.isActive("heading", { level: 3 })}
        disabled={off}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        disabled={off}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        disabled={off}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Quote"
        active={editor.isActive("blockquote")}
        disabled={off}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Link"
        active={editor.isActive("link")}
        disabled={off}
        onClick={setLink}
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolButton>
      <span className="mx-1 h-4 w-px bg-line" />
      <ToolButton
        label="Align left"
        active={editor.isActive({ textAlign: "left" })}
        disabled={off}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Align center"
        active={editor.isActive({ textAlign: "center" })}
        disabled={off}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Align right"
        active={editor.isActive({ textAlign: "right" })}
        disabled={off}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        label="Clear formatting"
        disabled={off}
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        <RemoveFormatting className="h-3.5 w-3.5" />
      </ToolButton>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  disabled,
  fill,
  placeholder = "Write the email…",
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: toEditorHtml(value),
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML());
    },
    editorProps: {
      attributes: {
        class: "rich-editor-content outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const next = toEditorHtml(value);
    if (editor.getHTML() === next) return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-md border border-line bg-paper",
        fill ? "h-full" : "min-h-[22rem]",
      )}
    >
      {editor ? (
        <Toolbar editor={editor} disabled={disabled} />
      ) : (
        <div className="h-9 border-b border-line bg-paper-raised" />
      )}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-3 py-2",
          !fill && "min-h-[18rem]",
        )}
      >
        {editor ? (
          <EditorContent editor={editor} className="h-full" />
        ) : (
          <p className="text-sm text-ink-muted">{placeholder}</p>
        )}
      </div>
    </div>
  );
}
