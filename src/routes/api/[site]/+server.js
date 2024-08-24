import { json } from '@sveltejs/kit'
import supabase_admin from '$lib/supabase/admin'
import page_search from './page-search'
import pool from '$lib/aws/postgres-client'

export async function GET({ url, params }) {
  if (url.searchParams.has('search')) {
    return await page_search(url, params.site)
  }

  const [
    { data: site_res },
    { data: page_res },
    { data: subpages_data },
    { data: sections_res },
  ] = await Promise.all([
    supabase_admin
      .from('sites')
      .select()
      .filter('url', 'eq', params.site)
      .single(),
    supabase_admin
      .from('pages')
      .select('*, site!inner(url)')
      .match({ url: 'index', 'site.url': params.site })
      .single(),
    supabase_admin
      .from('pages')
      .select('*, site!inner(url)')
      .match({ 'site.url': params.site }),
    supabase_admin
      .from('sections')
      .select('*, page!inner( site!inner(url) )')
      .match({
        'page.site.url': params.site,
        'page.url': 'index',
      }),
  ])

  // postgresql
  const pos_site_res = await pool.query(
    'SELECT * FROM sites WHERE url = $1 LIMIT 1',
    [params.site]
  )

  const pos_page_res = await pool.query(
    `SELECT pages.*, sites.url as site_url FROM pages 
       INNER JOIN sites ON pages.site_id = sites.id 
       WHERE pages.url = 'index' AND sites.url = $1 LIMIT 1`,
    [params.site]
  )

  const pos_subpages_data = await pool.query(
    `SELECT pages.*, sites.url as site_url FROM pages 
       INNER JOIN sites ON pages.site_id = sites.id 
       WHERE sites.url = $1`,
    [params.site]
  )

  const pos_sections_res = await pool.query(
    `SELECT sections.*, pages.url as page_url, sites.url as site_url FROM sections 
       INNER JOIN pages ON sections.page_id = pages.id 
       INNER JOIN sites ON pages.site_id = sites.id 
       WHERE pages.url = 'index' AND sites.url = $1`,
    [params.site]
  )

  const site = {
    ...site_res['content']['en'],
    _meta: {
      id: site_res.id,
      name: site_res.name,
      url: site_res.url,
      created_at: site_res.created_at,
    },
  }

  const page = {
    ...page_res['content']['en'],
    _meta: {
      id: page_res.id,
      name: page_res.name,
      url: page_res.url,
      created_at: page_res.created_at,
      // filtering here because the query above is not filtering properly (maybe a Supabase bug)
      subpages: subpages_data
        ?.filter(
          (subpage) => subpage.parent === null && subpage.url !== 'index'
        )
        .map((subpage) => ({
          id: subpage.id,
          name: subpage.name,
          url: subpage.url,
          created_at: subpage.created_at,
        })),
    },
  }

  const sections = sections_res
    ?.sort((a, b) => a.index - b.index)
    .map((section) => ({
      ...section.content.en,
      _meta: {
        id: section.id,
        symbol: section.symbol,
        created_at: section.created_at,
      },
    }))

  return json({
    site,
    page,
    sections,
  })
}
