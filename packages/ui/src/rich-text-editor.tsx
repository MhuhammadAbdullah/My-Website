"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Code2,
  Link as LinkIcon,
  Table as TableIcon,
  Image as ImageIcon,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  RemoveFormatting,
  Loader2,
} from "lucide-react";
import { cn } from "./lib/cn";
import { Button } from "./button";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { Skeleton } from "./skeleton";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Lets the host app wire up its own upload flow (e.g. Cloudinary) without
   * this package taking a dependency on it -- returns the URL to insert. */
  onImageUpload?: (file: File) => Promise<string>;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, onImageUpload, className }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow" } }),
      ImageExtension.configure({ HTMLAttributes: { class: "rounded-lg" } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: placeholder ?? "Start writing…" }),
    ],
    content: value,
    editorProps: {
      attributes: { class: "rich-text min-h-[16rem] px-4 py-3 focus:outline-none" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keeps the editor in sync when `value` changes from outside -- e.g. a
  // GET response resolving after the editor already mounted with empty
  // content, or loading a different record into the same mounted form.
  React.useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  if (!editor) {
    return (
      <div className={cn("overflow-hidden rounded-2xl border border-neutral-200", className)}>
        <Skeleton className="h-11 w-full rounded-none" />
        <Skeleton className="h-64 w-full rounded-none" />
      </div>
    );
  }

  return (
    // No `overflow-hidden` here -- it would clip the sticky toolbar below to
    // this container's own box, defeating position: sticky. Rounding is
    // applied to the toolbar/content pieces individually instead.
    <div className={cn("rounded-2xl border border-neutral-200 bg-background", className)}>
      <TooltipProvider delayDuration={200}>
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-2xl border-b border-neutral-200 bg-neutral-50/95 p-2 shadow-sm backdrop-blur">
          <BlockTypeSelect editor={editor} />
          <Divider />
          <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
            <Code className="size-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Checklist" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
            <ListChecks className="size-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            <Code2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Horizontal divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus className="size-4" />
          </ToolbarButton>
          <Divider />
          <LinkButton editor={editor} />
          <ImageButton editor={editor} onImageUpload={onImageUpload} />
          <ToolbarButton
            label="Insert table"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <TableIcon className="size-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            label="Align left"
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Align center"
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Align right"
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Justify"
            active={editor.isActive({ textAlign: "justify" })}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustify className="size-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton label="Clear formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
            <RemoveFormatting className="size-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
            <Undo className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
            <Redo className="size-4" />
          </ToolbarButton>
        </div>
      </TooltipProvider>
      <EditorContent editor={editor} className="overflow-hidden rounded-b-2xl" />
    </div>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px shrink-0 bg-neutral-200" />;
}

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          // Keep the editor's text selection/focus intact -- without this,
          // clicking a toolbar button blurs the editor first, which loses
          // the selection a command like toggleBold() needs to apply to.
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-heading disabled:pointer-events-none disabled:opacity-40",
            active && "bg-accent-50 text-accent-600 hover:bg-accent-100 hover:text-accent-700",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const BLOCK_TYPES = [
  { value: "paragraph", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "h4", label: "Heading 4" },
  { value: "h5", label: "Heading 5" },
  { value: "h6", label: "Heading 6" },
] as const;

function currentBlockType(editor: Editor): string {
  for (let level = 1; level <= 6; level++) {
    if (editor.isActive("heading", { level })) return `h${level}`;
  }
  return "paragraph";
}

function BlockTypeSelect({ editor }: { editor: Editor }) {
  const value = currentBlockType(editor);

  function setBlockType(next: string) {
    if (next === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = Number(next.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  }

  return (
    <Select value={value} onValueChange={setBlockType}>
      <SelectTrigger className="h-8 w-36 shrink-0 px-2.5 text-body-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BLOCK_TYPES.map((t) => (
          <SelectItem key={t.value} value={t.value}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");

  React.useEffect(() => {
    if (open) setUrl((editor.getAttributes("link").href as string | undefined) ?? "");
  }, [open, editor]);

  function applyLink() {
    const trimmed = url.trim();
    if (trimmed) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setOpen(false);
  }

  function removeLink() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <ToolbarButton label="Link" active={editor.isActive("link")}>
            <LinkIcon className="size-4" />
          </ToolbarButton>
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="h-9 px-3 py-1.5 text-body-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
          />
          <Button type="button" size="sm" onClick={applyLink}>
            Set
          </Button>
        </div>
        {editor.isActive("link") && (
          <Button type="button" variant="ghost" size="sm" className="mt-2 w-full" onClick={removeLink}>
            Remove link
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ImageButton({ editor, onImageUpload }: { editor: Editor; onImageUpload?: (file: File) => Promise<string> }) {
  const [open, setOpen] = React.useState(false);
  const [urlInput, setUrlInput] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function insertUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    editor.chain().focus().setImage({ src: trimmed }).run();
    setUrlInput("");
    setOpen(false);
  }

  async function handleFile(file: File | undefined) {
    if (!file || !onImageUpload) return;
    setUploading(true);
    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
      setOpen(false);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <ToolbarButton label="Image">
            <ImageIcon className="size-4" />
          </ToolbarButton>
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        {onImageUpload && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : "Upload image"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="my-3 flex items-center gap-2 text-body-sm text-neutral-400">
              <div className="h-px flex-1 bg-neutral-200" />
              or
              <div className="h-px flex-1 bg-neutral-200" />
            </div>
          </>
        )}
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Image URL"
            className="h-9 px-3 py-1.5 text-body-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                insertUrl();
              }
            }}
          />
          <Button type="button" size="sm" onClick={insertUrl}>
            Add
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
