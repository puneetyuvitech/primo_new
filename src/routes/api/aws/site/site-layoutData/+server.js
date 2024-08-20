import pool from '$lib/aws/postgres-client'

export const POST = async ({ request }) => {
  const { site_url, page_url } = await request.json()
  console.log(' -------------------- site_url', site_url, page_url)
  try {
    // Query for the site
    const siteRes = await pool.query('SELECT * FROM sites WHERE url = $1', [
      site_url,
    ])
    const site = siteRes.rows[0]
    console.log(' ------ site', site)

    if (!site) {
      return new Response('Site not found', { status: 404 })
    }

    // Query for the page
    const pageRes = await pool.query(
      `SELECT * FROM pages WHERE url = $1 AND site = $2`,
      [page_url, site.id]
    )
    const page = pageRes.rows[0]

    if (!page && page_url !== 'index') {
      return new Response('Page not found', { status: 404 })
    }

    // Query for all pages related to the site
    const pagesRes = await pool.query(
      'SELECT * FROM pages WHERE site = $1 ORDER BY created_at ASC',
      [site.id]
    )
    const pages = pagesRes.rows

    // Query for all symbols related to the site
    const symbolsRes = await pool.query(
      'SELECT * FROM symbols WHERE site = $1 ORDER BY index ASC',
      [site.id]
    )
    const symbols = symbolsRes.rows

    // Query for all sections related to the page
    const sectionsRes = await pool.query(
      'SELECT id, page, index, content, symbol FROM sections WHERE page = $1 ORDER BY index ASC',
      [page.id]
    )
    const sections = sectionsRes.rows

    // Combine all data into a single response
    const data = {
      site,
      page,
      pages,
      symbols,
      sections,
    }

    return new Response(JSON.stringify(data), { status: 200 })
  } catch (err) {
    console.error(err)
  }
}
