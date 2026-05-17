import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // ใช้ Sarabun เป็น default sans-serif (ผ่าน CSS variable จาก next/font)
        // fallback → tailwind default sans (system-ui, -apple-system, ...)
        sans: ['var(--font-sarabun)', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  // typography plugin — เปิดใช้ `prose` class สำหรับเนื้อหา rich text
  //   (Tiptap editor + activity description display)
  plugins: [typography],
};

export default config;
