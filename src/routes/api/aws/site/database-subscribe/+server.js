import { json } from '@sveltejs/kit'
import pool from '$lib/aws/postgres-client'
import axios from 'axios'
import { getFiles } from '$lib/supabase/storage'

export async function POST({ request }) {
  const { table, action, data, id, match, order } = await request.json()
  let query, queryParams

  try {
    if (action === 'insert') {
      const keys = Object.keys(data)
      const values = Object.values(data)
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ')
      query = `INSERT INTO ${table} (${keys.join(
        ', '
      )}) VALUES (${placeholders}) RETURNING *`
      queryParams = values
    } else if (action === 'update') {
      const keys = Object.keys(data)
      const values = Object.values(data)
      const updates = keys
        .map((key, index) => `${key} = $${index + 1}`)
        .join(', ')
      query = `UPDATE ${table} SET ${updates} WHERE id = $${
        keys.length + 1
      } RETURNING *`
      queryParams = [...values, id]
    } else if (action === 'delete') {
      if (id) {
        query = `DELETE FROM ${table} WHERE id = $1 RETURNING *`
        queryParams = [id]
      } else if (match) {
        const keys = Object.keys(match)
        const values = Object.values(match)
        const conditions = keys
          .map((key, index) => `${key} = $${index + 1}`)
          .join(' AND ')
        query = `DELETE FROM ${table} WHERE ${conditions} RETURNING *`
        queryParams = values
      }
    } else if (action === 'upsert') {
      const keys = Object.keys(data)
      const values = Object.values(data)
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ')
      query = `INSERT INTO ${table} (${keys.join(
        ', '
      )}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${keys
        .map((key, index) => `${key} = EXCLUDED.${key}`)
        .join(', ')} RETURNING *`
      queryParams = values
    } else if (action === 'select') {
      const keys = data || '*'
      const conditions = match
        ? `WHERE ${Object.keys(match)
            .map((key, index) => `${key} = $${index + 1}`)
            .join(' AND ')}`
        : ''
      const orderBy = order ? `ORDER BY ${order.join(', ')}` : ''
      query = `SELECT ${keys} FROM ${table} ${conditions} ${orderBy}`
      queryParams = match ? Object.values(match) : []
    }

    const client = await pool.connect()
    const result = await client.query(query, queryParams)
    client.release()

    return json(result.rows)
  } catch (error) {
    console.error('Error handling database request:', error)
    return json({ error: 'Internal Server Error' })
  }
}
