# Project Guidance

## User Preferences

- Private two-person chat between the user and one friend
- Conversation access gated behind a connection code
- Support sharing files, photos, audio, and music
- Polished, modern theme with light and dark support

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- ChatError is a backend enum, so it must be a value import/re-export from @/backend — `import type` triggers TS1361 when used as a value in a Record key.
- useActor(createActor) from @caffeineai/core-infrastructure returns { actor, isFetching }; gate queries with enabled: !!actor && !isFetching.
- Object storage uploads use ExternalBlob.fromBytes(bytes, file.type, file.name).withUploadProgress(cb); detect media type from mimeType/filename, never from getDirectURL().
- Touch-safe reveal: default opacity-100 and apply opacity-0 + group-hover:opacity-100 only at sm: so hover polish stays on desktop while mobile keeps the action visible.
- Distinguish append from prepend by comparing the newest item's id, not items.length, when deciding whether to auto-scroll a paginated thread.
- Motoko module-level `let` must be a static expression; operators, function calls, and array indexing fail with M0014. Motoko has no triple-quoted strings.
- At most one pending migration per build (check-limit=1); fold a second pending migration into the earliest pending file and delete the duplicate. An identity migration must be deleted, not kept.
- OQL manual entities over Map values cannot access the map key; use OQL.Entity.manual over .entries() with a tuple row type. A scoped OQL entity traps at .build() without an owner column; use .ownedByWith with a custom check.
- useInfiniteQuery with a nullable bigint pageParam needs all five generics or pageParam infers as {} | null and fails the actor call.
- The generated-app test suite lives in src/frontend (Vitest + jsdom + Testing Library) plus test/pocketic/backend.test.ts; run it with `pnpm --dir app test`.
