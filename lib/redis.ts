import { Redis } from "@upstash/redis";

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Set cache with optional expiry (seconds)
 */
export async function setCache(key: string, value: any, ttlInSeconds?: number) {
    try {
        const serialized =
            typeof value === "string" ? value : JSON.stringify(value);
        if (ttlInSeconds) {
            await redis.set(key, serialized, { ex: ttlInSeconds });
        } else {
            await redis.set(key, serialized);
        }
        console.log(`🟢 Cached key: ${key}`);
    } catch (err) {
        console.error(`❌ Error setting cache for key: ${key}`, err);
    }
}

/**
 * Get cached value safely
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
    try {
        const data = await redis.get<string>(key);
        if (!data) return null;

        // Handle both raw strings and stringified JSON
        if (typeof data === "string" && data.trim().startsWith("{")) {
            return JSON.parse(data);
        }

        return data as any; // fallback for plain strings
    } catch (err) {
        console.error(`❌ Error parsing cache for key: ${key}`, err);
        return null;
    }
}

/**
 * Delete cache
 */
export async function deleteCache(key: string) {
    await redis.del(key);
    console.log(`🗑️ Deleted key: ${key}`);
}
