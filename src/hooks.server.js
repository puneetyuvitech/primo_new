import {
  PUBLIC_SUPABASE_PUBLIC_KEY,
  PUBLIC_SUPABASE_URL,
} from '$env/static/public'
import '$lib/supabase'
import supabase_admin from '$lib/supabase/admin'
import { createSupabaseServerClient } from '@supabase/auth-helpers-sveltekit'
// import keycloak from '$lib/aws/auth'
import pool from '$lib/aws/postgres-client'
// import { KEYCLOAK_URL, KEYCLOAK_REALM } from '$env/static/public'
import fetch from 'node-fetch' // or use any HTTP client

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ resolve, event }) {
  event.locals.supabase = createSupabaseServerClient({
    supabaseUrl: PUBLIC_SUPABASE_URL,
    supabaseKey: PUBLIC_SUPABASE_PUBLIC_KEY,
    event,
  })

  event.locals.getSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession()
    return session
  }

  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range'
    },
  })

  const is_preview = event.url.searchParams.has('preview')
  if (is_preview) {
    // retrieve site and page from db
    const [{ data: site }, { data: page }] = await Promise.all([
      supabase_admin
        .from('sites')
        .select('id, url')
        .eq('url', event.params.site)
        .single(),
      supabase_admin
        .from('pages')
        .select('id, url, site!inner(*)')
        .match({
          url: event.params.page || 'index',
          'site.url': event.params.site,
        })
        .single(),
    ])

    if (!site || !page) return new Response('no page found')

    const { data: file } = await supabase_admin.storage
      .from('sites')
      .download(`${site.id}/${page.id}/index.html`)

    return new Response(file || 'no preview found', {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  response.headers.set('Access-Control-Allow-Origin', '*')

  return response
}

// export async function handle({ event, resolve }) {
//   // Middleware for token validation and user info retrieval
//   const token = event.request.headers
//     .get('Authorization')
//     ?.replace('Bearer ', '')
//   let userInfo = null

//   if (token) {
//     try {
//       // Validate token and get user info
//       userInfo = await getUserInfo(token)
//       event.locals.keycloak = { token, userInfo }
//     } catch (error) {
//       console.error('Error fetching user info:', error)
//       return new Response('Authentication Error', { status: 401 })
//     }
//   } else {
//     event.locals.keycloak = null
//   }

//   // Provide getSession method
//   event.locals.getSession = async () => {
//     if (userInfo) {
//       return {
//         token,
//         userInfo,
//       }
//     }
//     return null
//   }

//   // Resolve the request
//   const response = await resolve(event, {
//     filterSerializedResponseHeaders(name) {
//       return name === 'content-range'
//     },
//   })

//   const is_preview = event.url.searchParams.has('preview')
//   if (is_preview) {
//     try {
//       const siteResult = await pool.query(
//         'SELECT id, url FROM sites WHERE url = $1',
//         [event.params.site]
//       )
//       const pageResult = await pool.query(
//         `SELECT id, url, site_id FROM pages
//          WHERE url = $1 AND site_id = (SELECT id FROM sites WHERE url = $2)`,
//         [event.params.page || 'index', event.params.site]
//       )

//       const site = siteResult.rows[0]
//       const page = pageResult.rows[0]

//       if (!site || !page) return new Response('no page found')

//       // Assuming you have a way to access file storage, e.g., AWS S3 or similar
//       const file = await getFileFromStorage(`${site.id}/${page.id}/index.html`)

//       return new Response(file || 'no preview found', {
//         headers: {
//           'Content-Type': 'text/html;charset=UTF-8',
//           'Access-Control-Allow-Origin': '*',
//         },
//       })
//     } catch (error) {
//       console.error('Error fetching preview:', error)
//       return new Response('Error retrieving preview', { status: 500 })
//     }
//   }

//   // Handle CORS preflight requests
//   if (event.request.method === 'OPTIONS') {
//     return new Response(null, {
//       headers: {
//         'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
//         'Access-Control-Allow-Origin': '*',
//       },
//     })
//   }

//   response.headers.set('Access-Control-Allow-Origin', '*')
//   return response
// }

// async function getUserInfo(token: string) {
//   const response = await fetch(
//     `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     }
//   )

//   if (!response.ok) {
//     throw new Error('Failed to fetch user info')
//   }

//   return response.json() // User info object
// }
