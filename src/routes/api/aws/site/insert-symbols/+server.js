import { json } from '@sveltejs/kit'
import pool from '$lib/aws/postgres-client'

export async function POST({ request }) {
  const symbols = await request.json()
  console.log('data---------------', symbols)

  const query = `
    INSERT INTO public.symbols (id, name, site, code, fields, content, index)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO NOTHING
  `

  let client

  try {
    client = await pool.connect()

    for (const symbol of symbols) {
      const values = [
        symbol.id || '',
        symbol.name || '',
        symbol.site || '',
        JSON.stringify(symbol.code) || '{}',
        JSON.stringify(symbol.fields) || '{}',
        JSON.stringify(symbol.content) || '{}',
        symbol.index || 0,
      ]

      await client.query(query, values)
    }
    return json({ message: 'Symbols inserted successfully' }, { status: 200 })
  } catch (err) {
    console.error('Symbols inserting data:', err, err)
    return json(
      { error: 'Symbols inserting data', details: err },
      { status: 500 }
    )
  } finally {
    if (client) {
      client.release()
    }
  }
}
