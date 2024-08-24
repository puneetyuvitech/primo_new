import pool from '$lib/aws/postgres-client'
import { json } from '@sveltejs/kit'

export async function POST({ request }) {
  const { userId } = await request.json()
  console.log('------UserId', userId)

  // Query to get sites
  const sitesQuery = `
    SELECT id, name, url, active_deployment, 
           (SELECT json_agg(c) FROM collaborators c WHERE c.site = s.id) as collaborators
    FROM sites s
    ORDER BY created_at ASC
  `

  // Query to get user with server_members and collaborators
  const userQuery = `
    SELECT 
      u.email,
      u.created_at,
      u.id,
      COALESCE((SELECT json_agg(json_build_object('role', sm.role, 'admin', sm.admin)) FROM server_members sm WHERE sm.user = u.id), '[]'::json) as server_members,
      COALESCE((SELECT json_agg(json_build_object('id', c.id, 'user', c.user, 'site', c.site, 'created_at', c.created_at, 'role', c.role)) FROM collaborators c WHERE c.user = u.id), '[]'::json) as collaborators
    FROM users u
    WHERE u.id = $1
  `

  try {
    // Fetch sites and user data in parallel
    const [sitesResult, userResult] = await Promise.all([
      pool.query(sitesQuery),
      pool.query(userQuery, [userId]),
    ])

    const sites = sitesResult.rows
    const user = userResult.rows[0]

    // Ensure proper formatting
    const user_final = {
      ...user,
      server_members: user.server_members || [],
      collaborators: user.collaborators || [],
    }

    console.log('-------User', user_final)

    return json({ sitesData: sites, userData: user_final })
  } catch (error) {
    console.error('PostgreSQL Query Error:', error)
    return json(
      { error: 'Failed to retrieve data' },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
