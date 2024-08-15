import { json } from '@sveltejs/kit'
import pool from '$lib/aws/postgres-client'

export async function POST({ request }) {
  const data = await request.json()
  console.log('data---------------', data)

  const query = `
    INSERT INTO public.sites (id, name, url, code, fields, content)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO NOTHING
  `

  const values = [
    data.id,
    data.name,
    data.url,
    JSON.stringify(data.code),
    JSON.stringify(data.fields),
    JSON.stringify(data.content),
  ]

  let client

  try {
    client = await pool.connect()
    console.log('----------', client)

    await client.query(query, values)
    return json({ message: 'Data inserted successfully' }, { status: 200 })
  } catch (err) {
    console.error('Error inserting data:', err, err)
    return json(
      { error: 'Error inserting data', details: err },
      { status: 500 }
    )
  } finally {
    if (client) {
      client.release()
    }
  }
}
