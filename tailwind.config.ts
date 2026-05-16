import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

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
  plugins: [],
};

export default config;
