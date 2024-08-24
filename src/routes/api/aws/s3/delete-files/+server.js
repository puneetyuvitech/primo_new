import s3client from '$lib/aws/s3-client'
import { json } from '@sveltejs/kit'

export async function POST({ request }) {
  const { paths } = await request.json()

  if (!paths || paths.length === 0) {
    return json({ message: 'No files to delete' }, { status: 400 })
  }
  console.log(
    '----- Files for deletion ',
    paths.map((path) => ({ Key: path }))
  )
  const deleteParams = {
    Bucket: 'alhussein-supabase',
    Delete: {
      Objects: paths.map((path) => ({ Key: path })),
    },
  }

  try {
    const deleteResult = await s3client.deleteObjects(deleteParams).promise()
    console.log('Files deleted from S3:', deleteResult)
    return json({ message: 'Files deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting files from S3:', error)
    return json({ message: 'Error deleting files', error }, { status: 500 })
  }
}
