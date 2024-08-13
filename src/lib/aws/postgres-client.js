import { Pool } from 'pg'

// Load environment variables
import {
  PG_HOST,
  PG_PORT,
  PG_USER,
  PG_PASSWORD,
  PG_DATABASE,
} from '$env/static/private'

// Create a new PostgreSQL client
const pool = new Pool({
  host: PG_HOST,
  port: parseInt(PG_PORT, 10),
  user: PG_USER,
  password: PG_PASSWORD,
  database: PG_DATABASE,
  ssl: {
    rejectUnauthorized: false,
  },
})

export default pool
