'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useEffect } from 'react';

interface Props {
  value: string; // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  // class แค่เพิ่ม class นอก (เช่น min-h, font-size override)
  className?: string;
}

// ── Tiptap rich text editor ────────────────────────────────────
//   เก็บ value เป็น HTML string (compatible กับ plain text เดิม — Tiptap parse ได้)
//   Toolbar: ฟีเจอร์พื้นฐานสำหรับเขียนเนื้อหากิจกรรม
//     bold / italic / strike
//     heading 2 / 3
//     bullet list / ordered list
//     link (prompt URL)
//     blockquote
//     undo / redo
//   ไม่มี image upload — ใช้ poster + gallery แทน
//   ไม่มี code block / color / alignment — keep simple
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'เริ่มเขียนรายละเอียด...',
  disabled = false,
  className = '',
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // ปิด code block (ไม่ใช้)
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          class: 'text-blue-600 underline',
        },
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false, // กัน SSR hydration mismatch
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none min-h-[8rem] px-3 py-2 focus:outline-none ${className}`,
        // กัน user-agent style ทำให้ link ใน prose มี underline ผิด
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      // ถ้า editor ว่างจริง (Tiptap จะคืน '<p></p>') → ส่ง '' แทน
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // sync external value change → editor (เช่น initial load หรือ external reset)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalized = value || '<p></p>';
    if (current !== normalized) {
      // emitUpdate=false กัน loop (setContent → onUpdate → onChange → re-render → setContent ...)
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  // sync disabled prop
  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable !== !disabled) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  return (
    <div
      className={`overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      {editor && <Toolbar editor={editor} disabled={disabled} />}
      <div className="border-t border-gray-100">
        <EditorContent editor={editor} placeholder={placeholder} />
      </div>
    </div>
  );
}

// ── Toolbar ────────────────────────────────────────────────────

function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const btn = (active: boolean) =>
    `inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${
      active ? 'bg-blue-100 text-blue-700' : ''
    }`;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-gray-100 bg-gray-50/60 p-1.5">
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        disabled={disabled}
        label="ตัวหนา"
        icon={Bold}
        cls={btn(editor.isActive('bold'))}
      />
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        disabled={disabled}
        label="ตัวเอียง"
        icon={Italic}
        cls={btn(editor.isActive('italic'))}
      />
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        disabled={disabled}
        label="ขีดฆ่า"
        icon={Strikethrough}
        cls={btn(editor.isActive('strike'))}
      />

      <Divider />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        disabled={disabled}
        label="หัวข้อใหญ่"
        icon={Heading2}
        cls={btn(editor.isActive('heading', { level: 2 }))}
      />
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        disabled={disabled}
        label="หัวข้อย่อย"
        icon={Heading3}
        cls={btn(editor.isActive('heading', { level: 3 }))}
      />

      <Divider />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        disabled={disabled}
        label="รายการ"
        icon={List}
        cls={btn(editor.isActive('bulletList'))}
      />
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        disabled={disabled}
        label="รายการตัวเลข"
        icon={ListOrdered}
        cls={btn(editor.isActive('orderedList'))}
      />
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        disabled={disabled}
        label="ยกข้อความ"
        icon={Quote}
        cls={btn(editor.isActive('blockquote'))}
      />

      <Divider />

      <ToolbarBtn
        onClick={() => setLink(editor)}
        active={editor.isActive('link')}
        disabled={disabled}
        label="ลิงก์"
        icon={LinkIcon}
        cls={btn(editor.isActive('link'))}
      />

      <Divider />

      <ToolbarBtn
        onClick={() => editor.chain().focus().undo().run()}
        active={false}
        disabled={disabled || !editor.can().undo()}
        label="ย้อนกลับ"
        icon={Undo2}
        cls={btn(false)}
      />
      <ToolbarBtn
        onClick={() => editor.chain().focus().redo().run()}
        active={false}
        disabled={disabled || !editor.can().redo()}
        label="ทำซ้ำ"
        icon={Redo2}
        cls={btn(false)}
      />
    </div>
  );
}

function ToolbarBtn({
  onClick,
  disabled,
  label,
  icon: Icon,
  cls,
}: {
  onClick: () => void;
  active: boolean;
  disabled: boolean;
  label: string;
  icon: typeof Bold;
  cls: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // กัน focus loss จาก editor
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cls}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-4 w-px bg-gray-200" />;
}

// helper: prompt url + apply link
//   - ถ้าเลือก text แล้ว toggleLink — set; ถ้ายังไม่ได้เลือก จะใส่ไม่ได้
//   - cancel หรือ url ว่าง = unset link (ถ้ามี)
function setLink(editor: Editor) {
  const prev = editor.getAttributes('link').href ?? '';
  const url = window.prompt('URL (ใส่ว่างเพื่อลบลิงก์):', prev);
  if (url === null) return; // user cancelled
  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url })
    .run();
}
