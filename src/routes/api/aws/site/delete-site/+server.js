import { json } from '@sveltejs/kit'
import pool from '$lib/aws/postgres-client'
import axios from 'axios'
import { getFiles } from '$lib/supabase/storage'
import s3client from '$lib/aws/s3-client'

// export async function POST({ request }) {
//   const { site, delete_repo, delete_files } = await request.json()

//   try {
//     // Begin a transaction
//     await pool.query('BEGIN')

//     // Delete related data from various tables
//     await pool.query(
//       'DELETE FROM sections WHERE page IN (SELECT id FROM pages WHERE site = $1)',
//       [site.id]
//     )
//     await pool.query('DELETE FROM pages WHERE site = $1', [site.id])
//     await pool.query('DELETE FROM symbols WHERE site = $1', [site.id])
//     await pool.query('DELETE FROM invitations WHERE site = $1', [site.id])
//     await pool.query('DELETE FROM collaborators WHERE site = $1', [site.id])

//     // Optionally delete associated files if delete_files is true
//     if (delete_files) {
//       const siteFiles = await getFiles('sites', site.id)
//       // if (siteFiles.length) await removeFiles('sites', siteFiles);

//       const imageFiles = await getFiles('images', site.id)
//       // if (imageFiles.length) await removeFiles('images', imageFiles);
//     }

//     // Optionally delete associated repository if delete_repo is true
//     // if (delete_repo) {
//     //   const repo_deleted = await axios.post('/api/deploy/delete', { site })
//     //   if (!repo_deleted.data.success) {
//     //     await pool.query('ROLLBACK')
//     //     return new Response(
//     //       JSON.stringify({
//     //         success: false,
//     //         message:
//     //           "Could not delete repo. Ensure Personal Access Token has the 'delete_repo' permission",
//     //       }),
//     //       { status: 500 }
//     //     )
//     //   }
//     // }

//     // Delete the site itself
//     await pool.query('DELETE FROM sites WHERE id = $1', [site.id])

//     // Commit transaction
//     await pool.query('COMMIT')

//     return new Response(
//       JSON.stringify({
//         success: true,
//         message: 'Site deleted successfully',
//       }),
//       { status: 200 }
//     )
//   } catch (error) {
//     // Rollback transaction in case of an error
//     await pool.query('ROLLBACK')
//     console.error('Error deleting site:', error)

//     return new Response(
//       JSON.stringify({
//         success: false,
//         message: 'Error deleting site',
//       }),
//       { status: 500 }
//     )
//   }
// }

export async function POST({ request }) {
  const { site, delete_repo, delete_files } = await request.json()

  try {
    const [pagesResult, sectionsResult, symbolsResult] = await Promise.all([
      pool.query(
        'SELECT id, url, name, code, fields, content, site, parent FROM pages WHERE site = $1',
        [site.id]
      ),
      pool.query(
        `SELECT id, content, page AS "pageId", symbol, "index" 
         FROM sections 
         WHERE page IN (
           SELECT id 
           FROM pages 
           WHERE site = $1
         )`,
        [site.id]
      ),
      pool.query(
        'SELECT id, name, code, fields, content, site FROM symbols WHERE site = $1',
        [site.id]
      ),
    ])
    const pages = pagesResult.rows
    const sections = sectionsResult.rows
    const symbols = symbolsResult.rows
    const backup_json = JSON.stringify({
      site,
      pages,
      sections: sections.map((section) => {
        console.log('-----section', section)
        return {
          ...section,
          page: section.pageId,
        }
      }),
      symbols,
      version: 2,
    })

    const params = {
      Bucket: 'alhussein-supabase',
      Key: `backups/${site.url}-${site.id}.json`,
      Body: backup_json,
      ContentType: 'text/html',
    }

    await s3client.putObject(params).promise()

    if (sections) {
      await Promise.all(
        sections.map((section) =>
          pool.query('DELETE FROM sections WHERE id = $1', [section.id])
        )
      )
    }

    await Promise.all([
      pool.query('DELETE FROM pages WHERE site = $1', [site.id]),
      pool.query('DELETE FROM symbols WHERE site = $1', [site.id]),
      pool.query('DELETE FROM invitations WHERE site = $1', [site.id]),
      pool.query('DELETE FROM collaborators WHERE site = $1', [site.id]),
    ])
    let files = []
    let imageFiles = []
    if (delete_files) {
      // files = await listFilesFromS3('alhussein-supabase', `sites/${site.id}`)
      // if (files.length) {
      //   const deleteParams = {
      //     Bucket: 'alhussein-supabase',
      //     Delete: {
      //       Objects: files.map((path) => ({ Key: path })),
      //     },
      //   }
      //   await s3client.deleteObjects(deleteParams).promise()
      // }
      // imageFiles = await listFilesFromS3(
      //   'alhussein-supabase',
      //   `images/${site.id}`
      // )
      // if (imageFiles.length) {
      //   const deleteParams = {
      //     Bucket: 'alhussein-supabase',
      //     Delete: {
      //       Objects: imageFiles.map((path) => ({ Key: path })),
      //     },
      //   }
      //   await s3client.deleteObjects(deleteParams).promise()
      // }
      await deleteFilesFromS3('alhussein-supabase', `sites/${site.id}`)
      await deleteFilesFromS3('alhussein-supabase', `images/${site.id}`)
    }
    if (delete_repo) {
      const repo_deleted = await axios.post('/api/deploy/delete', { site })
      if (!repo_deleted) {
        alert(
          `Could not delete repo. Ensure Personal Access Token has the 'delete_repo' permission`
        )
      }
    }
    await pool.query('DELETE FROM sites WHERE id = $1', [site.id])
    console.log('    ---  Site Deleted Successfiully ---   ')
    return json({
      success: true,
      message: 'Successfully Site Deleted',
    })
  } catch (error) {
    console.error('Error deleting site:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error deleting site',
      }),
      { status: 500 }
    )
  }
}

// async function listFilesFromS3(bucket, path) {
//   let files = []
//   let dirs = []
//   let hasMore = true
//   let nextContinuationToken = null
//   console.log('---- path', path)
//   while (hasMore) {
//     try {
//       const params = {
//         Bucket: bucket,
//         Prefix: path,
//         ContinuationToken: nextContinuationToken,
//       }

//       const data = await s3client.listObjectsV2(params).promise()
//       if (data.Contents) {
//         console.log('-- data', data, data.Contents)
//         files = [
//           ...files,
//           ...data.Contents.map((item) => {
//             const filePath = item.Key
//             if (filePath && filePath.endsWith('/')) {
//               dirs.push(filePath)
//             }
//             return filePath
//           }),
//         ]
//       }

//       nextContinuationToken = data.NextContinuationToken
//       hasMore = !!nextContinuationToken
//     } catch (error) {
//       console.error('File listing error', error)
//       throw new Error('Error listing files')
//     }
//   }

//   for (const dir of dirs) {
//     files = await listFilesFromS3(bucket, dir)
//   }
//   console.log('----- files', files)
//   return files
// }

async function deleteFilesFromS3(bucket, path) {
  try {
    let hasMore = true
    let continuationToken = null

    while (hasMore) {
      const params = {
        Bucket: bucket,
        Prefix: path,
        ContinuationToken: continuationToken,
      }

      const data = await s3client.listObjectsV2(params).promise()
      if (data.Contents && data.Contents.length > 0) {
        const deleteParams = {
          Bucket: bucket,
          Delete: {
            Objects: data.Contents.map((item) => ({ Key: item.Key })),
          },
        }
        await s3client.deleteObjects(deleteParams).promise()
      }

      continuationToken = data.NextContinuationToken
      hasMore = !!continuationToken
    }
  } catch (error) {
    console.error('Error deleting files from S3:', error)
    throw new Error('Failed to delete files from S3')
  }
}
