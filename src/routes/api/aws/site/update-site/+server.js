import { json } from '@sveltejs/kit'
import pool from '$lib/aws/postgres-client'

// export async function POST({ request }) {
//   const siteData = await request.json()

//   const query = `
//     UPDATE public.sites
//     SET
//       name = $2,
//       url = $3,
//       code = $4,
//       fields = $5,
//       content = $6
//     WHERE id = $1
//   `

//   let client

//   try {
//     client = await pool.connect()

//     const values = [
//       siteData.id,
//       siteData?.name,
//       siteData?.url,
//       JSON.stringify(siteData?.code),
//       JSON.stringify(siteData?.fields),
//       JSON.stringify(siteData?.content),
//     ]
//     console.log(' --- values', values)

//     // Execute the update query
//     await client.query(query, values)

//     return json({ message: 'Site updated successfully' }, { status: 200 })
//   } catch (err) {
//     console.error('Error updating site:', err)
//     return json({ message: 'Error updating site', error: err }, { status: 500 })
//   } finally {
//     if (client) {
//       client.release()
//     }
//   }
// }

export async function POST({ request }) {
  const siteData = await request.json()

  const fieldsToUpdate = []
  const values = []

  if (siteData.name !== undefined) {
    fieldsToUpdate.push('name = $' + (fieldsToUpdate.length + 1))
    values.push(siteData.name)
  }
  if (siteData.url !== undefined) {
    fieldsToUpdate.push('url = $' + (fieldsToUpdate.length + 1))
    values.push(siteData.url)
  }
  if (siteData.code !== undefined) {
    fieldsToUpdate.push('code = $' + (fieldsToUpdate.length + 1))
    values.push(JSON.stringify(siteData.code))
  }
  if (siteData.fields !== undefined) {
    fieldsToUpdate.push('fields = $' + (fieldsToUpdate.length + 1))
    values.push(JSON.stringify(siteData.fields))
  }
  if (siteData.content !== undefined) {
    fieldsToUpdate.push('content = $' + (fieldsToUpdate.length + 1))
    values.push(JSON.stringify(siteData.content))
  }

  if (fieldsToUpdate.length === 0) {
    return json({ message: 'No fields to update' }, { status: 400 })
  }

  const query = `
      UPDATE public.sites
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = $${fieldsToUpdate.length + 1}
    `

  values.push(siteData.id)

  let client

  try {
    client = await pool.connect()

    console.log(' --- query', query)
    console.log(' --- values', values)

    await client.query(query, values)

    return json({ message: 'Site updated successfully' }, { status: 200 })
  } catch (err) {
    console.error('Error updating site:', err)
    return json({ message: 'Error updating site', error: err }, { status: 500 })
  } finally {
    if (client) {
      client.release()
    }
  }
}
