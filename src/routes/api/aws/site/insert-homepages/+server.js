import { json } from '@sveltejs/kit'
import pool from '$lib/aws/postgres-client'

export async function POST({ request }) {
  const pages = await request.json()
  const home_page = pages.find((page) => page.url === 'index')
  console.log('home_page---------------', home_page)

  const query = `
    INSERT INTO public.pages (id, name, url, site, parent, code, fields, content)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO NOTHING
  `

  let client

  try {
    client = await pool.connect()

    for (const page of pages) {
      const values = [
        page.id,
        page.name,
        page.url,
        page.site,
        page.parent,
        JSON.stringify(page.code) || '{}',
        JSON.stringify(page.fields) || '{}',
        JSON.stringify(page.content) || '{}',
      ]

      await client.query(query, values)
    }

    return json(
      { message: 'home pages inserted successfully' },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error inserting home pages:', err, err)
    return json(
      { error: 'Error inserting home pages', details: err },
      { status: 500 }
    )
  } finally {
    if (client) {
      client.release()
    }
  }
}
