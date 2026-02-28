# ADR-002: Result Pattern with stderr-lib

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2025-01-15 |
| **Tags** | error-handling, backend, services |

> **[Template]** This covers the base template feature. Extend or modify for your project.

## Context

Express applications commonly handle errors by throwing exceptions and relying on a global error handler middleware. This approach has several problems: thrown errors are invisible in function signatures, callers cannot distinguish expected business errors (e.g., "user not found") from unexpected failures (e.g., database connection lost) without inspecting error types at runtime, and forgotten try/catch blocks lead to unhandled promise rejections that crash the process. The service layer needs a pattern that makes error handling explicit, type-safe, and impossible to ignore.

## Decision

All service methods return `Result<T>` from the `stderr-lib` package. The `tryCatch()` wrapper converts any thrown exception inside the callback into a structured error result. Services never throw -- they always return `{ ok: true, value: T }` or `{ ok: false, error: Error }`.

```typescript
// Service -- always returns Result<T>
static async getById(id: string): Promise<Result<Item>> {
  return tryCatch(async () => {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    if (!item) throw new Error('Item not found');
    return item;
  });
}

// Controller -- checks result.ok before responding
const result = await ItemService.getById(id);
if (!result.ok) {
  return void res.status(404).json({ success: false, error: 'Not found' });
}
res.json({ success: true, data: result.value });
```

A custom `ServiceError` class extends `Error` to carry HTTP-relevant metadata (status codes, error codes) while keeping services HTTP-unaware. Controllers inspect `ServiceError` properties to determine the appropriate HTTP status.

## Consequences

### Positive

- Error handling is enforced by TypeScript -- callers must check `result.ok` before accessing `result.value`
- No unhandled promise rejections from forgotten try/catch in service code
- Business errors and system errors flow through the same typed channel
- Service methods are trivially testable: assert on `result.ok` and `result.value` or `result.error`
- Stack traces are preserved inside the error result for logging

### Negative

- Every service call requires an `if (!result.ok)` check in the controller, adding repetitive boilerplate
- Developers accustomed to try/catch need to learn the Result pattern
- Composing multiple service calls requires nested or sequential result checks (no automatic short-circuiting like exceptions)
- The `stderr-lib` package is a third-party dependency, though it is small and has no transitive dependencies

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Throw + global error handler | Familiar Express pattern, less boilerplate | Errors invisible in types, easy to forget handling | Rejected |
| Custom Result type (hand-rolled) | No external dependency | Maintenance burden, reinventing wheel | Rejected |
| neverthrow library | Popular, well-typed, chainable | Heavier API surface (map, andThen, orElse), steeper learning curve | Rejected |
| **stderr-lib tryCatch + Result&lt;T&gt;** | Simple two-shape union, lightweight, preserves stack traces | Extra boilerplate per controller call | **Selected** |
