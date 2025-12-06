import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'plebone',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'plebone',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: true, // Auto-create tables (use migrations in production later)
  logging: process.env.NODE_ENV === 'development',
};

export default new DataSource(typeOrmConfig);
