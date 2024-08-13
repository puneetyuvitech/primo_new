import pool from '$lib/aws/postgres-client'

export async function GET() {
  const query = `
    SELECT * FROM sites 
    WHERE id = $1
  `
  const values = ['5255aa4e-b274-4080-8a9e-b9cfb21a5e12'] // Example key value

  let client

  try {
    // Acquire a client from the pool
    client = await pool.connect()

    // Execute the query
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
