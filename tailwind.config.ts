import type { Config } from "tailwindcss";

/**
 * Tailwind v4 is configured primarily through CSS (`@theme` in globals.css).
 * This file exists for tooling that still reads a JS config and to pin
 * content detection explicitly.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
