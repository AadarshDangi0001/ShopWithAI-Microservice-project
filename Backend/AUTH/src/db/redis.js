import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redis;

if (process.env.NODE_ENV === 'test') {
    // Lightweight stub so automated tests do not require a live Redis instance
    redis = {
        status: 'ready',
        async set() {
            return 'OK';
        },
        async get() {
            return null;
        },
        async del() {
            return 0;
        },
        on() {},
        disconnect() {},
        quit() {}
    };
} else {
    redis = new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
    });

    redis.on('connect', () => {
        console.log('Connected to Redis');
    });

    redis.on('error', (err) => {
        console.error('Redis connection error:', err);
    });
}

export default redis;