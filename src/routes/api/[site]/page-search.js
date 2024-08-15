import { json } from '@sveltejs/kit'
import supabase_admin from '$lib/supabase/admin'
import pool from '$lib/aws/postgres-client'

/** @param {URL} url */
/** @param {string} site_url */
export default async function page_search(url, site_url) {
  console.log('  --  PAGE - SEARCH  --  ')
  const options = {
    range: '0,9', // from,to # https://supabase.com/docs/reference/javascript/range
    search: '',
  }

  for (const p of url.searchParams) {
    if (options.hasOwnProperty(p[0])) {
      options[p[0]] = p[1]
    }
  }

  if (!options.search) {
    return json({
      error: 'The search query cannot be empty',
    })
  } else {
    const [{ data: pages_data, error }, { count: pages_total }] =
      await Promise.all([
        supabase_admin
          .rpc('page_search', {
            search_terms: options.search.replaceAll(' ', ' & '),
            site_url,
          })
          .select('id, name, url, created_at')
          .range(
            parseInt(options.range.split(',')[0]),
            parseInt(options.range.split(',')[1])
          ),
        supabase_admin.rpc(
          'page_search',
          {
            search_terms: options.search.replaceAll(' ', ' & '),
            site_url,
          },
          { count: 'exact', head: true }
        ),
      ])

    // RPC doesn't exist
    if (error) {
      return json({
        error: `The page_search RPC hasn't been added`,
      })
    }
    // postgreysql
    const searchTerms = options.search.replaceAll(' ', ' & ')
    const [rangeStart, rangeEnd] = options.range.split(',').map(Number)

    // Fetch pages data
    const pagesQuery = `
        SELECT id, name, url, created_at
        FROM pages
        WHERE to_tsvector('english', name || ' ' || content) @@ to_tsquery('english', $1)
        AND site_url = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4;
      `
    const pagesData = await pool.query(pagesQuery, [
      searchTerms,
      site_url,
      rangeEnd - rangeStart + 1,
      rangeStart,
    ])

    // Fetch total count of pages
    const countQuery = `
        SELECT COUNT(*)
        FROM pages
        WHERE to_tsvector('english', name || ' ' || content) @@ to_tsquery('english', $1)
        AND site_url = $2;
      `
    const pagesTotalRes = await pool.query(countQuery, [searchTerms, site_url])
    const pagesTotal = parseInt(pagesTotalRes.rows[0].count, 10)

    const pages = pages_data?.map((page) => ({
      _meta: {
        id: page.id,
        name: page.name,
        url: '/' + page.url,
        created_at: page.created_at,
      },
    }))

    return json({
      pages,
      pages_total,
    })
  }
}
