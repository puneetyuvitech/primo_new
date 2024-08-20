import s3client from '$lib/aws/s3-client'
import { json } from '@sveltejs/kit'

export async function POST({ request }) {
  const { content, path } = request.json()
  const params = {
    Bucket: 'alhussein-supabase',
    Key: path,
    Body: content,
    ContentType: 'text/html',
  }

  try {
    const uploadResult = await s3client.putObject(params).promise()
    console.log('File uploaded successfully to S3:', uploadResult)
    return json({ message: 'Site updated successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error uploading file to S3:', error)
    return json(
      { message: 'Error uploading preview', error: error },
      { status: 500 }
    )
  }
}
