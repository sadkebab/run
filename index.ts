type RunOptions<TContext> = {
  before?: () => TContext | Promise<TContext>;
  cleanup?: (ctx: TContext) => void | Promise<void>;
  onError?: (error: Error) => void;
  onInterrupt?: (singal: InterruptSignal) => void;
};

const interruptSignals = ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"] as const;
type InterruptSignal = (typeof interruptSignals)[number];

const deaultErrorHandler = (error: Error) => {
  console.error(error);
  process.exit(-1);
};

export async function run<TContext = undefined>(
  fn: (ctx: TContext) => void | Promise<void>,
  opts: RunOptions<TContext> = {}
) {
  process.on("uncaughtException", opts.onError || deaultErrorHandler);

  if (opts.onInterrupt) {
    interruptSignals.forEach((signal) => {
      process.on(signal, () => opts.onInterrupt!(signal));
    });
  }

  const ctx = opts.before ? await opts.before() : (undefined as TContext);

  if (opts.cleanup) {
    process.on("exit", (code) => {
      opts.cleanup!(ctx);
      process.exit(code);
    });
  }

  try {
    await fn(ctx);
  } catch (error) {
    if (error instanceof Error) {
      if (opts.onError) {
        opts.onError(error);
      }
    } else {
      console.error("Non-error thrown:", error);
    }
  }
}
