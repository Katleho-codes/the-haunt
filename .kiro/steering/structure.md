---
inclusion: always
---
# Project structure steering

- `app/`: Next.js route entry points, metadata and global CSS.
- `components/`: client and server UI components. Keep domain calculations out of presentation components.
- `lib/`: domain types, date utilities, parsing and persistence helpers.
- `public/`: first-party static assets, manifest and icons.
- `docs/`: product status, asset register and architecture decisions.
- `.kiro/steering/`: enduring product, technical, structure and visual guidance.
- `.kiro/specs/`: feature requirements, design and implementation tasks.
- `.kiro/hooks/`: project-scoped Kiro hook definitions.

Naming: use kebab-case for files, PascalCase for React components/types and camelCase for functions/variables. Prefer named exports for shared utilities. Keep components focused; extract domain logic into `lib/`.
