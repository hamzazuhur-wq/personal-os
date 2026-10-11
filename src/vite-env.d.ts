// Vite client types — provides ambient declarations for ?raw imports,
// asset imports, and other Vite-specific module types.
/// <reference types="vite/client" />

// Allow importing Markdown policy files as raw strings at build time.
// The proactive policy loader uses this to inject SOUL.md, RULES.md, etc.
// into AI prompts without a runtime filesystem read.
declare module '*.md?raw' {
  const content: string;
  export default content;
}
