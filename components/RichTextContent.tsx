import DOMPurify from 'isomorphic-dompurify';

interface Props {
  // raw จาก backend — อาจเป็น HTML (จาก Tiptap editor) หรือ plain text (ข้อมูลเดิม)
  html: string | null | undefined;
  className?: string;
}

// ── RichTextContent — แสดงเนื้อหา (HTML จาก Tiptap หรือ plain text เดิม) ─────
//   1. ถ้า input ไม่มี HTML tag → wrap ใน <p> + whitespace-pre-line (รักษา \n ของ plain text เดิม)
//   2. ถ้ามี HTML tag → sanitize ด้วย DOMPurify ก่อน inject (กัน XSS)
//   3. แสดงผ่าน Tailwind `prose` class — heading / list / link มี typography ดี
//
//   allowed tags (จาก default DOMPurify): p, h1-h6, ul, ol, li, strong, em, s, a,
//   blockquote, br, span — ตรงกับ extensions ที่ Tiptap export (StarterKit + Link)
//   strip: <script>, <iframe>, on*= attributes (DOMPurify default)
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    's',
    'h2',
    'h3',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'span',
  ],
  ALLOWED_ATTR: ['href', 'rel', 'class', 'target'],
  ALLOWED_URI_REGEXP: /^(?:https?:\/\/|mailto:|tel:|#)/i,
};

export function RichTextContent({ html, className = '' }: Props) {
  if (!html || !html.trim()) {
    return <p className={`text-sm text-gray-400 ${className}`}>—</p>;
  }

  const hasHtml = /<[a-z][\s\S]*>/i.test(html);

  if (!hasHtml) {
    // plain text เดิม — แสดงรักษา \n
    return (
      <p
        className={`whitespace-pre-line text-sm leading-relaxed text-gray-700 ${className}`}
      >
        {html}
      </p>
    );
  }

  // HTML — sanitize ก่อน render
  const clean = DOMPurify.sanitize(html, PURIFY_CONFIG);

  return (
    <div
      className={`prose prose-sm max-w-none text-gray-700 ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
