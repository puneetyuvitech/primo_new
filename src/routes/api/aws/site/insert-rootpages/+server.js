import { json } from '@sveltejs/kit'
import pool from '$lib/aws/postgres-client'

export async function POST({ request }) {
  const pages = await request.json()

  // Ensure pages is an array
  if (!Array.isArray(pages)) {
    return json({ error: 'Invalid data format' }, { status: 400 })
  }

  // Define the query
  const query = `
      INSERT INTO public.pages (id, name, url, site, parent, code, fields, content)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `

  let client

  try {
    client = await pool.connect()
    console.log('----------', client)

    for (const page of pages) {
      const values = [
        page.id || '',
        page.name || '',
        page.url || '',
        page.site || '',
        page.parent || '',
        JSON.stringify(page.code) || '{}',
        JSON.stringify(page.fields) || '{}',
        JSON.stringify(page.content) || '{}',
      ]

      // Execute the query
      await client.query(query, values)
    }

    return json(
      { message: 'root pages inserted successfully' },
      { status: 200 }
    )
  } catch (err) {
    // Log the detailed error message
    console.error('Error inserting root pages:', err)
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release()
    }
  }
}
