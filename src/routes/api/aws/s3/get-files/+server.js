// import { json } from '@sveltejs/kit'
// import s3client from '$lib/aws/s3-client'

// export async function POST({ request }) {
//   const { bucket, path } = await request.json()
//   let files = []
//   let dirs = []

//   try {
//     const params = {
//       Bucket: bucket,
//       Prefix: path,
//     }

//     const data = await s3client.listObjectsV2(params).promise()

//     if (data.Contents) {
//       files = [
//         ...files,
//         ...data.Contents.map((item) => {
//           const filePath = item.Key
//           if (filePath && filePath.endsWith('/')) {
//             dirs.push(filePath)
//           }
//           return filePath
//         }),
//       ]
//     }
//   } catch (error) {
//     console.error('File listing error', error)
//     return json(
//       { message: 'Error listing files', error: error },
//       { status: 500 }
//     )
//   }

//   for (const dir of dirs) {
//     files = await getFilesFromS3(bucket, dir, files)
//   }

//   return json({ files }, { status: 200 })
// }

// async function getFilesFromS3(bucket, path, files = []) {
//   let dirs = []

//   try {
//     const params = {
//       Bucket: bucket,
//       Prefix: path,
//     }

//     const data = await s3client.listObjectsV2(params).promise()

//     if (data.Contents) {
//       files = [
//         ...files,
//         ...data.Contents.map((item) => {
//           const filePath = item.Key
//           if (filePath && filePath.endsWith('/')) {
//             dirs.push(filePath)
//           }
//           return filePath
//         }),
//       ]
//     }
//   } catch (error) {
//     console.error('File listing error', error)
//   }

//   for (const dir of dirs) {
//     files = await getFilesFromS3(bucket, dir, files)
//   }

//   return files
// }

import { json } from '@sveltejs/kit'
import s3client from '$lib/aws/s3-client'

export async function POST({ request }) {
  const { bucket, path } = await request.json()
  let files = []

  try {
    files = await listFilesFromS3(bucket, path)
  } catch (error) {
    console.error('File listing error', error)
    return json(
      { message: 'Error listing files', error: error },
      { status: 500 }
    )
  }

  return json({ files }, { status: 200 })
}

async function listFilesFromS3(bucket, path) {
  let files = []
  let dirs = []
  let hasMore = true
  let nextContinuationToken = null
  console.log('---- path', path)
  while (hasMore) {
    try {
      const params = {
        Bucket: bucket,
        Prefix: path,
        ContinuationToken: nextContinuationToken,
      }

      const data = await s3client.listObjectsV2(params).promise()
      if (data.Contents) {
        console.log('-- data', data, data.Contents)
        files = [
          ...files,
          ...data.Contents.map((item) => {
            const filePath = item.Key
            if (filePath && filePath.endsWith('/')) {
              dirs.push(filePath)
            }
            return filePath
          }),
        ]
      }

      nextContinuationToken = data.NextContinuationToken
      hasMore = !!nextContinuationToken
    } catch (error) {
      console.error('File listing error', error)
      throw new Error('Error listing files')
    }
  }

  for (const dir of dirs) {
    files = await listFilesFromS3(bucket, dir)
  }
  console.log('----- files', files)
  return files
}
