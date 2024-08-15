import { json } from '@sveltejs/kit'
import pool from '$lib/aws/postgres-client'

export async function POST({ request }) {
  const childPages = await request.json()

  // Define the query
  const query = `
      INSERT INTO public.pages (id, name, url, site, parent, code, fields, content)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `

  let client

  try {
    client = await pool.connect()

    for (const page of childPages) {
      console.log('-- Page Details ', page)
      const values = [
        page.id,
        page.name,
        page.url,
        page.site,
        page.parent,
        JSON.stringify(page.code),
        JSON.stringify(page.fields),
        JSON.stringify(page.content),
      ]

      // Execute the query
      await client.query(query, values)
    }

    return json(
      { message: 'child pages inserted successfully' },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error inserting child pages:', err)
  } finally {
    if (client) {
      client.release()
    }
  }
}
