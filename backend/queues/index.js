const { executeWorkflow } = require('../workflow-engine');

let workflowQueue = null;
let redisAvailable = false;

// ── Try to connect to Redis (optional) ─────────────────────────────────────
try {
    const { Queue, Worker } = require('bullmq');
    const Redis = require('ioredis');

    const connection = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: null,
        lazyConnect: true,               // Don't connect immediately
        enableOfflineQueue: false,
        retryStrategy(times) {
            if (times >= 1) return null; // Give up after 1 retry
            return 500;
        }
    });

    connection.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
            if (redisAvailable) {
                console.warn('\n⚠️  [Redis] Disconnected — falling back to direct execution mode.');
                redisAvailable = false;
            }
        } else {
            console.error('[Redis] Error:', err.message);
        }
    });

    connection.on('ready', () => {
        redisAvailable = true;
        console.log('✅ [Redis] Connected — BullMQ job queue active.');
    });

    // Attempt connection
    connection.connect().then(() => {
        workflowQueue = new Queue('workflowQueue', { connection });

        const worker = new Worker('workflowQueue', async job => {
            const { workflowId, data } = job.data;
            console.log(`▶️  [Queue] Starting workflow ${workflowId} (job ${job.id})`);
            await executeWorkflow(workflowId, data);
        }, { connection });

        worker.on('completed', job => {
            console.log(`✅ [Queue] Job ${job.id} completed.`);
        });

        worker.on('failed', (job, err) => {
            console.error(`❌ [Queue] Job ${job.id} failed: ${err.message}`);
        });

    }).catch(() => {
        console.warn('⚠️  [Redis] Not available — running in direct execution mode (no job queue).');
    });

} catch (err) {
    console.warn('⚠️  [Queue] BullMQ/Redis not loaded — running in direct execution mode.');
}

// ── queueWorkflow: uses BullMQ if Redis is up, otherwise runs directly ──────
async function queueWorkflow(workflowId, data) {
    if (workflowQueue && redisAvailable) {
        const job = await workflowQueue.add('runWorkflow', { workflowId, data });
        console.log(`📋 [Queue] Workflow ${workflowId} queued as job ${job.id}`);
        return job.id;
    }

    // Fallback: execute synchronously without Redis
    console.log(`⚡ [Direct] Executing workflow ${workflowId} directly (Redis unavailable)`);
    const fakeJobId = `direct-${Date.now()}`;
    executeWorkflow(workflowId, data).catch(err => {
        console.error(`❌ [Direct] Workflow ${workflowId} failed: ${err.message}`);
    });
    return fakeJobId;
}

module.exports = {
    queueWorkflow,
    get workflowQueue() { return workflowQueue; }
};
