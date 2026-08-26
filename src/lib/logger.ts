type LogLevel = "info" | "warn" | "error" | "debug";

interface LogPayload {
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  error?: Error | unknown;
}

class Logger {
  private formatLog(level: LogLevel, payload: LogPayload) {
    const timestamp = new Date().toISOString();
    const errorDetails = payload.error instanceof Error ? {
      name: payload.error.name,
      message: payload.error.message,
      stack: payload.error.stack,
    } : payload.error;

    return JSON.stringify({
      timestamp,
      level,
      context: payload.context ?? "SYSTEM",
      message: payload.message,
      metadata: payload.metadata ?? {},
      ...(errorDetails ? { error: errorDetails } : {}),
    });
  }

  info(message: string, context?: string, metadata?: Record<string, unknown>) {
    console.log(this.formatLog("info", { message, context, metadata }));
  }

  warn(message: string, context?: string, metadata?: Record<string, unknown>) {
    console.warn(this.formatLog("warn", { message, context, metadata }));
  }

  error(message: string, error?: Error | unknown, context?: string, metadata?: Record<string, unknown>) {
    console.error(this.formatLog("error", { message, error, context, metadata }));
  }

  debug(message: string, context?: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      console.debug(this.formatLog("debug", { message, context, metadata }));
    }
  }
}

export const logger = new Logger();
