import { json } from '@sveltejs/kit'
import pool from '$lib/aws/postgres-client'

export async function POST({ request }) {
  const { provider } = await request.json()

  const query = `
    SELECT value
    FROM public.config
    WHERE id = $1
    LIMIT 1
  `

  const values = [`${provider}_token`]

  try {
    const result = await pool.query(query, values)

    if (result.rows.length > 0) {
      const token = result.rows[0].value
      return json({ token }, { status: 200 })
    } else {
      return json({ error: 'Token not found' }, { status: 404 })
    }
  } catch (err) {
    console.error('Error fetching token:', err)
    return json(
      { error: 'Error fetching token', details: err },
      { status: 500 }
    )
  } finally {
    if (pool) {
      pool.release()
    }
  }
}
