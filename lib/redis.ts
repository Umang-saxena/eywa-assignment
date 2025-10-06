import Redis from "ioredis";

let redis: Redis | null = null;

if (!redis) {
    if (process.env.REDIS_URL) {
        // ✅ For production (e.g., Upstash, Render, or any managed Redis)
        redis = new Redis(process.env.REDIS_URL);
    } else {
        // ✅ For local development (Docker Redis)
        redis = new Redis({
            host: process.env.REDIS_HOST || "127.0.0.1",
            port: Number(process.env.REDIS_PORT) || 6379,
            // password: process.env.REDIS_PASSWORD, // optional
        });
    }

    redis.on("connect", () => {
        console.log("✅ Connected to Redis");
    });

    redis.on("error", (err) => {
        console.error("❌ Redis connection error:", err);
    });
}

/**
 * Set a cache value with optional expiry time (in seconds)
 */
export async function setCache(key: string, value: any, ttlInSeconds?: number): Promise<void> {
    try {
        const serializedValue = JSON.stringify(value);
        if (ttlInSeconds) {
            await redis!.setex(key, ttlInSeconds, serializedValue);
        } else {
            await redis!.set(key, serializedValue);
        }
        console.log(`🟢 Cached key: ${key}`);
    } catch (err) {
        console.error("❌ Error setting cache:", err);
    }
}

/**
 * Get a cached value and parse JSON if possible
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
    try {
        const data = await redis!.get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.error("❌ Error getting cache:", err);
        return null;
    }
}

/**
 * Delete a cached value
 */
export async function deleteCache(key: string): Promise<void> {
    try {
        await redis!.del(key);
        console.log(`🗑️ Deleted cache key: ${key}`);
    } catch (err) {
        console.error("❌ Error deleting cache:", err);
    }
}

export default redis;
