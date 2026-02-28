# Getting Started

> Quick start guide for the fullstack template.

This template can be used in two ways:
1. **Start a new project** - Clone/fork and build your application on top
2. **Expand the template** - Contribute new features to the template itself

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Docker** (for PostgreSQL and MinIO)

---

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repo-url> my-project
cd my-project

# Install dependencies
pnpm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL and MinIO containers
pnpm docker:up

# Verify containers are running
docker ps
```

### 3. Set Up Environment

```bash
# Copy example environment file
cp apps/api/.env.example apps/api/.env
```

The default `.env` works with the Docker containers out of the box.

### 4. Initialize Database

```bash
# Generate migrations from schema
pnpm db:generate

# Apply migrations
pnpm db:migrate

# (Optional) Seed with test data
pnpm db:seed
```

### 5. Start Development

```bash
# Start both API and web in parallel
pnpm dev
```

- **API**: http://localhost:3000
- **Web**: http://localhost:5173
- **API Health**: http://localhost:3000/health

---

## Project Structure

```
fullstack-template/
├── apps/
│   ├── api/                 # Express backend
│   │   ├── src/
│   │   │   ├── controllers/ # Request handlers
│   │   │   ├── services/    # Business logic
│   │   │   ├── routes/      # Route definitions
│   │   │   ├── db/          # Drizzle schema & migrations
│   │   │   ├── middleware/  # Express middleware
│   │   │   ├── lib/         # Shared utilities
│   │   │   └── providers/   # External integrations
│   │   └── package.json
│   │
│   └── web/                 # React frontend
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── pages/       # Page components
│       │   ├── hooks/       # Custom hooks (TanStack Query)
│       │   ├── api/         # API client
│       │   └── stores/      # Zustand stores
│       └── package.json
│
├── packages/
│   └── shared/              # Shared types & utilities
│
├── docs/                    # Documentation
└── package.json             # Root workspace config
```

---

## Common Commands

| Command             | Description                            |
|---------------------|----------------------------------------|
| `pnpm dev`          | Start API and web in parallel          |
| `pnpm dev:api`      | Start API only                         |
| `pnpm dev:web`      | Start web only                         |
| `pnpm build`        | Build all packages                     |
| `pnpm test`         | Run all unit and integration tests     |
| `pnpm test:e2e`     | Run Playwright E2E tests               |
| `pnpm lint`         | Lint all packages                      |
| `pnpm db:generate`  | Generate migration from schema changes |
| `pnpm db:migrate`   | Apply pending migrations               |
| `pnpm db:studio`    | Open Drizzle Studio GUI                |
| `pnpm db:seed`      | Seed database with test data           |
| `pnpm docker:up`    | Start Docker containers                |
| `pnpm docker:down`  | Stop Docker containers                 |
| `pnpm docker:reset` | Stop containers and delete all data    |

---

## Starting a New Project

When using this template to start a new project:

### 1. Rename the Project

Update `package.json` files:
- Root `package.json`: Change `"name": "fullstack-template"` to your project name
- `packages/shared/package.json`: Change `"name": "@fullstack-template/shared"` to `"@your-project/shared"`
- Update imports in `apps/api` and `apps/web` that reference `@fullstack-template/shared`

### 2. Update Docker Configuration

In `docker-compose.yml`, update container names and database credentials:
```yaml
services:
  db:
    container_name: your-project-db
    environment:
      POSTGRES_DB: your_project
      POSTGRES_USER: your_user
      POSTGRES_PASSWORD: secure_password
```

Update `apps/api/.env` to match.

### 3. Initialize Fresh Git History (Optional)

```bash
rm -rf .git
git init
git add .
git commit -m "Initial commit from fullstack-template"
```

### 4. Add Your First Feature

See [Adding Features](#adding-features) below.

---

## Adding Features

### Adding a New API Endpoint

1. **Create the schema** (if needed) in `apps/api/src/db/schema/`:

```typescript
// src/db/schema/posts.ts
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

2. **Export from index** in `apps/api/src/db/schema/index.ts`:

```typescript
export * from './posts.js';
```

3. **Generate and apply migration**:

```bash
pnpm db:generate
pnpm db:migrate
```

4. **Create validation schema** in `apps/api/src/schemas/`:

```typescript
// src/schemas/post.schema.ts
import { z } from 'zod/v4';

export const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
});

export const updatePostSchema = createPostSchema.partial();
```

5. **Create service** in `apps/api/src/services/`:

```typescript
// src/services/post.service.ts
import { tryCatch, type Result } from 'stderr-lib';
import { db } from '../lib/db.js';
import { posts, type Post, type NewPost } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export class PostService {
  static async getAll(authorId: string): Promise<Result<Post[]>> {
    return tryCatch(async () => {
      return db.select().from(posts).where(eq(posts.authorId, authorId));
    });
  }

  static async create(data: NewPost): Promise<Result<Post>> {
    return tryCatch(async () => {
      const [post] = await db.insert(posts).values(data).returning();
      return post;
    });
  }
}
```

6. **Create controller** in `apps/api/src/controllers/`:

```typescript
// src/controllers/post.controller.ts
import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { PostService } from '../services/post.service.js';
import { createPostSchema } from '../schemas/post.schema.js';
import { z } from 'zod/v4';
import { logger } from '../lib/logger.js';

export class PostController {
  static async getAll(req: AuthRequest, res: Response): Promise<void> {
    const result = await PostService.getAll(req.user!.id);
    if (!result.ok) {
      logger.error('Failed to get posts', { error: result.error.toString() });
      return void res.status(500).json({ success: false, error: 'Failed to get posts' });
    }
    res.json({ success: true, data: result.value });
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({
        success: false,
        error: z.prettifyError(parsed.error),
      });
    }

    const result = await PostService.create({
      ...parsed.data,
      authorId: req.user!.id,
    });

    if (!result.ok) {
      logger.error('Failed to create post', { error: result.error.toString() });
      return void res.status(500).json({ success: false, error: 'Failed to create post' });
    }
    res.status(201).json({ success: true, data: result.value });
  }
}
```

7. **Create routes** in `apps/api/src/routes/`:

```typescript
// src/routes/post.routes.ts
import { Router } from 'express';
import { PostController } from '../controllers/post.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware); // All routes require auth

router.get('/', PostController.getAll);
router.post('/', PostController.create);

export default router;
```

8. **Register routes** in `apps/api/src/routes/index.ts`:

```typescript
import postRoutes from './post.routes.js';

router.use('/posts', postRoutes);
```

### Adding a Frontend Page

1. **Create API client** in `apps/web/src/api/`:

```typescript
// src/api/posts.ts
import { apiClient } from './client';

export interface Post {
  id: string;
  title: string;
  content?: string;
  createdAt: string;
}

export const postsApi = {
  getAll: () => apiClient.get<Post[]>('/posts'),
  create: (data: { title: string; content?: string }) =>
    apiClient.post<Post>('/posts', data),
};
```

2. **Create hook** in `apps/web/src/hooks/`:

```typescript
// src/hooks/usePosts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '../api/posts';

export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: postsApi.getAll,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
```

3. **Create page component** in `apps/web/src/pages/`:

```typescript
// src/pages/PostsPage.tsx
import { usePosts, useCreatePost } from '../hooks/usePosts';

export function PostsPage() {
  const { data: posts, isLoading } = usePosts();
  const createPost = useCreatePost();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Posts</h1>
      {posts?.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

4. **Add route** in your router configuration.

---

## Expanding the Template

When contributing new features to the template itself:

1. Features should be generic and reusable across projects
2. Follow existing patterns in `docs/architecture/`
3. Add documentation to `docs/features/`
4. Include tests for new functionality

---

## Troubleshooting

### Database connection errors

```bash
# Ensure Docker is running
docker ps

# Restart containers
pnpm docker:down
pnpm docker:up
```

### Migration errors

```bash
# Reset database (deletes all data!)
pnpm docker:reset
pnpm docker:up
pnpm db:migrate
```

### Port conflicts

Update ports in `docker-compose.yml` and corresponding `.env` files.

---

## Next Steps

- Read [CORE_PATTERNS.md](./architecture/CORE_PATTERNS.md) for coding patterns
- Review [DATA_MODEL.md](./architecture/DATA_MODEL.md) for database schema details
- Check [CODING_STANDARD.md](./architecture/CODING_STANDARD.md) for TypeScript conventions
