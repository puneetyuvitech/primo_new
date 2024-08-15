import { json, error as server_error } from '@sveltejs/kit'
import supabase_admin from '$lib/supabase/admin'
import axios from 'axios'
import pool from '$lib/aws/postgres-client'

export async function GET({ locals, url }) {
  const session = await locals.getSession()
  if (!session) {
    // the user is not signed in
    throw server_error(401, { message: 'Unauthorized' })
  }

  const provider = url.searchParams.get('provider')

  const { data: token } = await supabase_admin
    .from('config')
    .select('value')
    .eq('id', `${provider}_token`)
    .single()

  // postgresql
  let pos_token
  try {
    const res = await pool.query('SELECT value FROM config WHERE id = $1', [
      `${provider}_token`,
    ])
    pos_token = res.rows[0]
  } catch (err) {
    console.error('Error querying PostgreSQL', err)
  } finally {
    pool.release()
  }

  let repos = null
  if (provider === 'github' && token) {
    const headers = {
      Authorization: `Bearer ${token.value}`,
      Accept: 'application/vnd.github.v3+json',
    }

    const res = await Promise.all([
      axios.get(`https://api.github.com/user/repos?per_page=100`, {
        headers: { ...headers },
      }),
      axios.get(`https://api.github.com/user/repos?per_page=100&page=2`, {
        headers: { ...headers },
      }),
    ]).then((res) => res.map(({ data }) => data))

    repos = res.flat().map((repo) => ({
      id: repo.full_name,
      label: repo.name,
    }))
  } else if (provider === 'gitlab' && token) {
    const res = await axios.get('https://gitlab.com/api/v4/projects', {
      headers: { Authorization: `Bearer ${token.value}` },
      params: {
        owned: true,
        per_page: 100,
      },
    })

    repos = res.data?.map((project) => ({
      id: project.path_with_namespace,
      label: project.name,
    }))
  }

  return json(repos)
}
