import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const { MONGO_URI, MONGO_DB_NAME } = process.env;

if (!MONGO_URI || !MONGO_DB_NAME) {
  throw new Error('MongoDB environment variables are not properly defined');
}

// Create a MongoClient instance
const client = new MongoClient(MONGO_URI);

let database: Db | null = null;
let isConnected = false;

export const connectToMongoDB = async (): Promise<void> => {
  if (!isConnected) {
    await client.connect();
    database = client.db(MONGO_DB_NAME);
    isConnected = true;
  }
};

/**
 * Retrieves the connected MongoDB database instance.
 *
 * @returns {Db} The MongoDB database instance.
 * @throws {Error} If the database connection has not been established yet.
 * Ensure that `connectToMongoDB` is called before invoking this function.
 */
export const getMongoDB = (): Db => {
  if (!database) {
    throw new Error(
      'MongoDB has not been connected yet. Call connectToMongoDB first.',
    );
  }
  return database;
};
