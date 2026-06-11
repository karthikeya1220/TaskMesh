export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler');
    const { startHeartbeatMonitor } = await import('./lib/heartbeat-monitor');

    startScheduler();
    startHeartbeatMonitor();
  }
}
