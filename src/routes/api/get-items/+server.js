import pool from '$lib/aws/postgres-client'

export async function POST() {
  const query = `
    SELECT * FROM sites 
    WHERE id = $1
  `
  const values = ['f1ef8e50-d777-43b3-b8ef-4df1f16ead9a']
  let client

  try {
    client = await pool.connect()
    const result = await client.query(query, values)

    // Return the first row of the result
    return new Response(JSON.stringify(result.rows[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('PostgreSQL Query Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to retrieve data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release()
    }
  }
}
