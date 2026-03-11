import { app, InvocationContext, Timer } from '@azure/functions';

const DEFAULT_KEEP_ALIVE_FUNCTION_NAME = 'keepAlive';
const DEFAULT_KEEP_ALIVE_SCHEDULE = '0 */5 * * * *';

let isKeepAliveRegistered = false;

export interface RegisterKeepAliveOptions {
  schedule?: string;
  name?: string;
  runOnStartup?: boolean;
  useMonitor?: boolean;
  enabled?: boolean;
  log?: boolean | string;
}

/**
 * Registers a no-op timer trigger that can help reduce idle unloads for apps using the classic keep-alive workaround.
 *
 * This is a compatibility helper for plans where cold starts are still a concern. If your hosting plan supports
 * warm-instance features, prefer those platform capabilities over relying on a timer-based workaround.
 */
export function registerKeepAlive(options: RegisterKeepAliveOptions = {}) {
  if (isKeepAliveRegistered || options.enabled === false) return;

  const {
    schedule = DEFAULT_KEEP_ALIVE_SCHEDULE,
    name = DEFAULT_KEEP_ALIVE_FUNCTION_NAME,
    runOnStartup = false,
    useMonitor = true,
    log = false,
  } = options;

  app.timer(name, {
    schedule,
    runOnStartup,
    useMonitor,
    handler: (timer: Timer, context: InvocationContext) => {
      if (log === false) return;

      const logMessage = typeof log === 'string' ? log : `Keep-alive timer executed${timer.isPastDue ? ' after a missed schedule' : ''}.`;
      context.log(logMessage);
    },
  });

  isKeepAliveRegistered = true;
}
