# Run

A minimal declarative entrypoint for simple node/deno/bun scripts.
Enjoy the ergonomic hooks for lifecycle handlers and say goodbye forever to top-level await errors.

## Supports

- JavaScript
- TypeScript
- ESM
- CJS
- Modules
- Node.js
- Bun

## Install

With npm

```bash
npm install @sadkebab/run
```

With pnpm

```bash
pnpm add @sadkebab/run
```

With bun

```bash
bun add @sadkebab/run
```

## How to use

This utility exports a single `run` function you can use as an entrypoint for your node scripts.
Call the function with the main

```ts
import { run } from "@sadkebab/run";
import { memParse } from "@sadkebab/utils";

import { buildClient } from "./lib/db";
import mysql from "mysql2/promise";
import { z } from "zod";

const env = memParse(
  z.object({
    DB_HOST: z.string(),
    DB_PORT: z.coerce.number(),
    DB_USER: z.string(),
    DB_PASSWORD: z.string(),
    DB_DATABASE: z.string(),
  }),
  process.env
);

run(
  async ({ db }) => {
    const postContents = await db.all({
      table: "wp_posts",
      fields: ["ID", "post_content"],
      where: [{ field: "post_type", op: "=", value: "page" }],
    });

    const updated = await Promise.all(
      postContents.map((post) =>
        db.update({
          table: "wp_posts",
          set: {
            post_content:
              "<h1>Please stop using WordPress. I am tired of people asking me to fix their WordPress website</h2>",
          },
          where: [{ field: "ID", op: "=", value: post.ID }],
        })
      )
    );

    console.log(`[Updated] ${updated.length} pages`);
    process.exit(0);
  },
  {
    before: async () => {
      const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE } = env();

      const connection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_DATABASE,
      });

      const db = buildClient(connection, {
        log: false,
      });

      return { db };
    },
    cleanup: async ({ db }) => {
      await db.close();
    },
    onError: (error) => {
      console.error(error);
      process.exit(1);
    },
  }
);
```

## Options Parameter

The second parameter of the run function is optional and can have the following type.

```ts
type RunOptions<TContext> = {
  before?: () => TContext | Promise<TContext>;
  cleanup?: (ctx: TContext) => void | Promise<void>;
  onError?: (error: Error) => void;
  onInterrupt?: (singal: InterruptSignal) => void;
};
```

### Hooks

#### before

Will be run before the main function.
It'used to build a context object for your entrypoint that can be ergonomically recalled in the `cleanup` hook.

#### cleanup

Will be run when `process` emits and `exit` event.

#### onError

Will run if the program will throw an uncaught exception.

#### onInterrupt

Will run if the program receives an interruption signal, the specific signal string like `SIGINT` or `SIGTERM` will be passed as a parameter to the hook.
