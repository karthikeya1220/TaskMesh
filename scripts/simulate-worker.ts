import { parseArgs } from 'util';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    name: {
      type: 'string',
      short: 'n',
    },
  },
});

const workerName = values.name || `Worker-${Math.floor(Math.random() * 1000)}`;
let workerId: string | null = null;
let isBusy = false;

async function apiCall(endpoint: string, method: string = 'GET', body?: any) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${await res.text()}`);
    }
    return res.json();
  } catch (error) {
    console.error(`[${workerName}] API call failed:`, endpoint, error);
    return null;
  }
}

async function start() {
  console.log(`[${workerName}] Registering...`);
  const data = await apiCall('/workers/register', 'POST', { name: workerName });
  if (!data || !data.id) {
    console.error(`[${workerName}] Failed to register.`);
    process.exit(1);
  }
  workerId = data.id;
  console.log(`[${workerName}] Registered with ID: ${workerId}`);

  setInterval(async () => {
    await apiCall(`/workers/${workerId}/heartbeat`, 'POST');
  }, 10000);

  setInterval(async () => {
    if (isBusy) return;

    const pollData = await apiCall(`/workers/${workerId}/poll`);
    if (pollData && pollData.job) {
      const job = pollData.job;
      isBusy = true;
      console.log(`[${workerName}] Picked up job: ${job.name} (ID: ${job.id})`);

      const duration = job.payload?.duration || Math.floor(Math.random() * 3000) + 1000;
      console.log(`[${workerName}] Executing job for ${duration}ms...`);

      setTimeout(async () => {
        const failChance = Math.random();
        if (failChance < 0.1) {
          console.log(`[${workerName}] 💥 Job randomly failed!`);
          await apiCall(`/workers/${workerId}/fail`, 'POST', { job_id: job.id, error_message: 'Random simulated failure' });
        } else {
          console.log(`[${workerName}] ✅ Job completed successfully.`);
          await apiCall(`/workers/${workerId}/complete`, 'POST', { job_id: job.id, result: { success: true, duration } });
        }
        isBusy = false;
      }, duration);
    }
  }, 2000);
}

process.on('SIGINT', async () => {
  console.log(`\n[${workerName}] Deregistering...`);
  if (workerId) {
    await apiCall(`/workers/${workerId}`, 'DELETE');
  }
  process.exit(0);
});

start();
