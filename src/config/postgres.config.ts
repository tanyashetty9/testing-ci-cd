import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.util';

dotenv.config();

const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DATABASE,
  POSTGRES_HOST,
  POSTGRES_PORT,
} = process.env;

if (
  !POSTGRES_HOST ||
  !POSTGRES_PORT ||
  !POSTGRES_USER ||
  !POSTGRES_PASSWORD ||
  !POSTGRES_DATABASE
) {
  logger.error(
    '[/src/config/postgres.config]-[if(!POSTGRES_HOST || !POSTGRES_PORT || !POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DATABASE)]-Database environment variables are not properly defined',
  );
  throw new Error('Database environment variables are not properly defined');
}

const sequelizeConfig = {
  host: POSTGRES_HOST,
  port: parseInt(POSTGRES_PORT, 10),
  username: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  dialect: 'postgres' as const,
  logging: false,
  timezone: '+06:00',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  // pool: {
  //   max: 900,          // try increasing this if too low
  //   min: 0,
  //   acquire: 300000,   // wait time before throwing timeout error (ms)
  //   idle: 10000       // close idle connections after 10 seconds
  // }
};

const sequelizeWithoutDb = new Sequelize({
  ...sequelizeConfig,
  database: 'postgres',
});

export const sequelize = new Sequelize({
  ...sequelizeConfig,
  database: POSTGRES_DATABASE,
});

/**
 * Checks if the target PostgreSQL database exists, and creates it if it does not.
 *
 * This function uses a Sequelize instance (`sequelizeWithoutDb`) that is not bound
 * to a specific database to perform the operations. It first authenticates the connection,
 * then queries the `pg_database` system catalog to check for the existence of the target database.
 * If the database does not exist, it creates the database using a SQL `CREATE DATABASE` statement.
 *
 * Logs the progress and results of the operation using the `logger` utility.
 *
 * @throws Will throw an error if there is an issue during authentication, querying, or database creation.
 * @returns A promise that resolves to `void` once the operation is complete.
 */
export const createDatabaseIfNotExist = async (): Promise<void> => {
  try {
    logger.info(
      '[/src/config/postgres.config]-[createDatabaseIfNotExist()]-Checking if the target database exists...',
    );

    await sequelizeWithoutDb.authenticate();

    const [results] = await sequelizeWithoutDb.query(
      `SELECT 1 FROM pg_database WHERE datname = :dbName`,
      {
        replacements: { dbName: POSTGRES_DATABASE },
      },
    );

    const databaseExists = Array.isArray(results) && results.length > 0;

    if (databaseExists) {
      logger.info(
        `[/src/config/postgres.config]-[createDatabaseIfNotExist()]-Database "${POSTGRES_DATABASE}" already exists.`,
      );
    } else {
      logger.info(
        `[/src/config/postgres.config]-[createDatabaseIfNotExist()]-Database "${POSTGRES_DATABASE}" not found. Creating...`,
      );
      await sequelizeWithoutDb.query(`CREATE DATABASE "${POSTGRES_DATABASE}"`);
      logger.info(
        `[/src/config/postgres.config]-[createDatabaseIfNotExist()]-Database "${POSTGRES_DATABASE}" has been created successfully.`,
      );
    }
  } catch (error) {
    logger.error(
      '[/src/config/postgres.config]-[createDatabaseIfNotExist()]-Error while checking or creating the database:',
      error as Record<string, unknown>,
    );
    throw error;
  } finally {
    await sequelizeWithoutDb.close();
  }
};
