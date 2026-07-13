type LogMeta = Record<string, unknown>;

function write(
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  meta?: LogMeta,
): void {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === "ERROR") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write("INFO", message, meta),
  warn: (message: string, meta?: LogMeta) => write("WARN", message, meta),
  error: (message: string, meta?: LogMeta) => write("ERROR", message, meta),
};
