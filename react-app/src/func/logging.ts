export enum LogSeverity {
  VERBOSE = "VERBOSE",
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

export function log(text: string, severity: LogSeverity) {
  const logText = `[${new Date().toISOString()}] [${severity}] ${text}`;

  switch (severity) {
    case LogSeverity.VERBOSE:
      console.debug(logText);
      break;
    case LogSeverity.INFO:
      console.info(logText);
      break;
    case LogSeverity.WARNING:
      console.warn(logText);
      break;
    case LogSeverity.ERROR:
      console.error(logText);
      break;
    default:
      console.log(logText);
      break;
  }
}

/** Creates and returns a scoped logging function. */
export function createScopedLog(scope: string) {
  return (text: string, severity: LogSeverity) => {
    log(`[${scope}] ${text}`, severity);
  };
}
