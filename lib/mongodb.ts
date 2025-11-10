import mongoose, { ConnectionStates, Mongoose } from 'mongoose';

/**
 * Shape of the cached connection object stored on the Node.js global object.
 * This prevents opening multiple connections during development with HMR.
 */
interface MongooseCache {
  conn: Mongoose | null; // Active Mongoose connection instance when connected
  promise: Promise<Mongoose> | null; // In-flight connection promise, if connecting
}

/**
 * Augment NodeJS global type so TypeScript knows about our cache key.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

const MONGODB_URI: string | undefined = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Fail fast if the connection string is missing. This is thrown at import time to
  // catch misconfiguration early both in server actions and route handlers.
  throw new Error(
    'Missing environment variable: MONGODB_URI. Add it to your .env.local or hosting environment.'
  );
}

// Use the existing cache if present (in dev) or initialize a new one (in prod or first run)
const globalForMongoose = global as typeof global & { _mongoose?: MongooseCache };
const cached: MongooseCache = globalForMongoose._mongoose ?? { conn: null, promise: null };

globalForMongoose._mongoose = cached;

/**
 * Options passed to mongoose.connect for better stability and compatibility.
 * Adjust as necessary for your MongoDB deployment version.
 */
const connectionOptions: Parameters<typeof mongoose.connect>[1] = {
  // Set a clean dbName here if your connection string omits one
  // dbName: 'app-db',
  // You can add any additional options supported by Mongoose connect here
};

/**
 * Establishes (or reuses) a Mongoose connection.
 * - Reuses an existing connection when available
 * - De-duplicates concurrent connect attempts using a shared promise
 * - Provides strict typing via Mongoose types
 */
export async function connectToDatabase(): Promise<Mongoose> {
  if (cached.conn) {
    // Already connected or connecting state that resolved previously
    return cached.conn;
  }

  if (!cached.promise) {
    // Start a new connection attempt and cache the promise to deduplicate calls
    cached.promise = mongoose.connect(MONGODB_URI!, connectionOptions).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/**
 * Utility to check the current ready state of Mongoose connection for diagnostics.
 * 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting, 99 = uninitialized
 */
export function getMongooseState(): ConnectionStates {
  return mongoose.connection.readyState;
}

/**
 * Optional: Graceful shutdown support. Call on process signals if you manage your own server.
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
