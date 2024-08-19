import { json } from '@sveltejs/kit'
import pool from '$lib/aws/postgres-client'

export async function POST({ request }) {
  const sections = await request.json()

  const query = `
      INSERT INTO public.sections (id, page, symbol, index, content)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `

  let client

  try {
    client = await pool.connect()

    for (const section of sections) {
      console.log('-- section Details ', section)
      const values = [
        section.id,
        section.page,
        section.symbol,
        section.index,
        JSON.stringify(section.content),
      ]
      console.log('-- Values for insertion:', values)

      await client.query(query, values)
    }

    return json({ message: 'sections inserted successfully' }, { status: 200 })
  } catch (err) {
    console.error('Error inserting sections:', err)
  } finally {
    if (client) {
      client.release()
    }
  }
}
