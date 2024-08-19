import { json } from '@sveltejs/kit'
import pool from '$lib/aws/postgres-client'

export async function POST({ request }) {
  const rootPages = await request.json()

  const query = `
      INSERT INTO public.pages (id, name, url, site, parent, code, fields, content)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `

  let client

  try {
    client = await pool.connect()

    for (const page of rootPages) {
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

      await client.query(query, values)
    }

    return json(
      { message: 'root pages inserted successfully' },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error inserting root pages:', err)
  } finally {
    if (client) {
      client.release()
    }
  }
}
