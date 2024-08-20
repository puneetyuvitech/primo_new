import s3client from '$lib/aws/s3-client'
import { json } from '@sveltejs/kit'

export async function POST({ request }) {
  const { bucket, key, file, options } = await request.json()
  console.log('-- KEY', key)
  try {
    const uploadParams = {
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(file, 'base64'),
    }
    const uploadResult = await s3client.upload(uploadParams).promise()

    const publicUrl = `https://${bucket}.s3.amazonaws.com/${key}`
    return json({ publicUrl }, { status: 200 })
  } catch (error) {
    console.error('Error uploading file to S3:', error)
    return json({ error: 'Failed to upload file to S3' }, { status: 500 })
  }
}
