import {
  PUBLIC_SUPABASE_PUBLIC_KEY,
  PUBLIC_SUPABASE_URL,
} from '$env/static/public'
import '$lib/supabase'
import supabase_admin from '$lib/supabase/admin'
import { createSupabaseServerClient } from '@supabase/auth-helpers-sveltekit'
import pool from '$lib/aws/postgres-client'
import s3client from '$lib/aws/s3-client'
import { json } from '@sveltejs/kit'

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
    // Postgresql
    // console.log('--------- URL ', event.params.site)
    // const siteResult = await pool.query(
    //   'SELECT id, url FROM sites WHERE url = $1',
    //   [event.params.site]
    // )
    // const pos_site = siteResult.rows[0]
    // console.log('------- pos_site', pos_site)
    // const pageResult = await pool.query(
    //   `SELECT p.id, p.url, s.*
    //    FROM pages p
    //    INNER JOIN sites s ON p.site_id = s.id
    //    WHERE p.url = $1 AND s.url = $2`,
    //   [event.params.page || 'index', event.params.site]
    // )
    // const pos_page = pageResult.rows[0]

    if (!site || !page) return new Response('no page found')

    const { data: file } = await supabase_admin.storage
      .from('sites')
      .download(`${site.id}/${page.id}/index.html`)

    // Postgresql
    // const params = {
    //   Bucket: 'alhussein-supabase',
    //   Key: `${site.id}/${page.id}/index.html`,
    // }
    // const s3Response = await s3client.getObject(params).promise()
    // if (s3Response.Body) {
    //   const fileContent = s3Response.Body.toString('utf-8')
    //   console.log('------ fileContent', fileContent)
    //   return new Response(file || 'no preview found', {
    //     headers: {
    //       'Content-Type': 'text/html;charset=UTF-8',
    //       'Access-Control-Allow-Origin': '*',
    //     },
    //   })
    // } else {
    //   console.log('Error occured')
    //   return json({ error: 'File not found' }, { status: 404 })
    // }

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
