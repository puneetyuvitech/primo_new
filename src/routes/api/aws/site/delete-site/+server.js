import { json } from '@sveltejs/kit'
import pool from '$lib/aws/postgres-client'
import axios from 'axios'
import { getFiles } from '$lib/supabase/storage'

export async function POST({ request }) {
  const { site, delete_repo, delete_files } = await request.json()

  try {
    // Begin a transaction
    await pool.query('BEGIN')

    // Delete related data from various tables
    await pool.query(
      'DELETE FROM sections WHERE page IN (SELECT id FROM pages WHERE site = $1)',
      [site.id]
    )
    await pool.query('DELETE FROM pages WHERE site = $1', [site.id])
    await pool.query('DELETE FROM symbols WHERE site = $1', [site.id])
    await pool.query('DELETE FROM invitations WHERE site = $1', [site.id])
    await pool.query('DELETE FROM collaborators WHERE site = $1', [site.id])

    // Optionally delete associated files if delete_files is true
    if (delete_files) {
      const siteFiles = await getFiles('sites', site.id)
      // if (siteFiles.length) await removeFiles('sites', siteFiles);

      const imageFiles = await getFiles('images', site.id)
      // if (imageFiles.length) await removeFiles('images', imageFiles);
    }

    // Optionally delete associated repository if delete_repo is true
    // if (delete_repo) {
    //   const repo_deleted = await axios.post('/api/deploy/delete', { site })
    //   if (!repo_deleted.data.success) {
    //     await pool.query('ROLLBACK')
    //     return new Response(
    //       JSON.stringify({
    //         success: false,
    //         message:
    //           "Could not delete repo. Ensure Personal Access Token has the 'delete_repo' permission",
    //       }),
    //       { status: 500 }
    //     )
    //   }
    // }

    // Delete the site itself
    await pool.query('DELETE FROM sites WHERE id = $1', [site.id])

    // Commit transaction
    await pool.query('COMMIT')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Site deleted successfully',
      }),
      { status: 200 }
    )
  } catch (error) {
    // Rollback transaction in case of an error
    await pool.query('ROLLBACK')
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
