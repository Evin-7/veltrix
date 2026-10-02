type LogValue = string | number | boolean | null | undefined;
type LogFields = Record<string, LogValue>;

function write(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), service: "veltrix-web", level, event, ...fields });
  if (level === "error") process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

export const logger = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
};
