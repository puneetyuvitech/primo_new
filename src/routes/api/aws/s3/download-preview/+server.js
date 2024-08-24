import s3client from '$lib/aws/s3-client'
import { json } from '@sveltejs/kit'

export async function POST({ request }) {
  const { key } = await request.json()
  try {
    const params = {
      Bucket: 'alhussein-supabase',
      Key: key,
    }

    const data = await s3client.getObject(params).promise()

    if (data.Body) {
      return json({ preview: data.Body.toString('utf-8') }, { status: 200 })
    } else {
      return json({ error: 'File not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error fetching file from S3:', error)
    return json({ error: 'Error fetching file' }, { status: 500 })
  }
}
