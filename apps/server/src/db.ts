import { setTimeout as sleep } from 'node:timers/promises';
import mongoose from 'mongoose';

/** Hides credentials when the connection string is logged. */
export function redactUri(uri: string): string {
  return uri.replace(/\/\/([^@/]+)@/, '//***@');
}

/**
 * Keeps retrying until MongoDB is reachable. In Docker the database container
 * can take a few seconds longer to start than the app.
 */
export async function connectDatabase(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);

  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`Connected to MongoDB at ${redactUri(uri)}`);
      return;
    } catch (error) {
      const delay = Math.min(attempt, 10);
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`MongoDB is not reachable yet (${reason}). Retrying in ${delay}s.`);
      await sleep(delay * 1000);
    }
  }
}

export const isDatabaseConnected = () =>
  mongoose.connection.readyState === mongoose.ConnectionStates.connected;
