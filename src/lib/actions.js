import supabase from '$lib/supabase'
import { getFiles } from '$lib/supabase/storage'
import axios from 'axios'
import { invalidate } from '$app/navigation'

export const sites = {
  create: async (data, preview = null) => {
    await supabase.from('sites').insert(data.site)
    console.log('----  data', data)
    try {
      const response = await fetch('/api/aws/site/insert-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.site),
      })

      const result = await response.json()
      console.log(result)
    } catch (error) {
      console.error('Error:', error)
    }

    // create symbols and root pages
    const { pages, symbols, sections } = data
    const home_page = pages.find((page) => page.url === 'index')
    const root_pages = pages.filter(
      (page) => page.parent === null && page.id !== home_page.id
    )
    const child_pages = pages.filter((page) => page.parent !== null)

    // create home page first (to ensure it appears first)
    console.log('  --  before  =-')
    await supabase.from('pages').insert(home_page)
    console.log('  --  after  =-')
    try {
      console.log('  --=-')
      const pageResponse = await fetch('/api/aws/site/insert-homepages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.pages),
      })

      const pageResult = await pageResponse.json()
      console.log(pageResult)
    } catch (error) {
      console.error('Error:', error)
    }

    await Promise.all([
      supabase.from('symbols').insert(symbols),
      supabase.from('pages').insert(root_pages),
    ])
    try {
      console.log('  --=-')
      const symbolResponse = await fetch('/api/aws/site/insert-symbols', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(symbols),
      })
      const symbolResult = await symbolResponse.json()
      console.log(symbolResult)
    } catch (error) {
      console.error('Error symbol:', error)
    }
    try {
      console.log('  --=-')
      const rootPagesResponse = await fetch('/api/aws/site/insert-rootpages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(root_pages),
      })

      const rootPageResult = await rootPagesResponse.json()
      console.log(rootPageResult)
    } catch (error) {
      console.error('Error Root Pages:', error)
    }

    // upload preview to supabase storage
    if (preview) {
      await supabase.storage
        .from('sites')
        .upload(`${data.site.id}/preview.html`, preview)
      // Upload to S3
      try {
        const uploadPreviewResponse = await fetch(
          '/api/aws/s3/upload-preview',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: preview,
              path: `${data.site.id}/preview.html`,
            }),
          }
        )
      } catch (error) {
        console.error('--- Error ', error)
      }
    }

    // create child pages (dependant on parent page IDs)
    await supabase.from('pages').insert(child_pages)
    try {
      console.log('  --=-')
      const childPagesResponse = await fetch(
        '/api/aws/site/insert-childpages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(child_pages),
        }
      )

      const childPageResult = await childPagesResponse.json()
      console.log(childPageResult)
    } catch (error) {
      console.error('Error child Pages:', error)
      return error
    }

    // create sections (dependant on page IDs)
    await supabase.from('sections').insert(sections)
    try {
      console.log('  --=-')
      const sectionResponse = await fetch('/api/aws/site/insert-sections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sections),
      })

      const sectionResult = await sectionResponse.json()
      console.log(sectionResult)
    } catch (error) {
      console.error('Error child Pages:', error)
      return error
    }
  },
  update: async (id, props) => {
    await supabase.from('sites').update(props).eq('id', id)
    try {
      const response = await fetch('/api/aws/site/update-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          ...props,
        }),
      })

      const result = await response.json()
      console.log(result)
    } catch (error) {
      console.error('Error:', error)
    }
  },
  delete: async (site, { delete_repo, delete_files }) => {
    const [{ data: pages }, { data: sections }, { data: symbols }] =
      await Promise.all([
        supabase
          .from('pages')
          .select('id, url, name, code, fields, content, site, parent')
          .filter('site', 'eq', site.id),
        supabase
          .from('sections')
          .select('id, content, page!inner(id, site), symbol, index')
          .filter('page.site', 'eq', site.id),
        supabase
          .from('symbols')
          .select('id, name, code, fields, content, site')
          .filter('site', 'eq', site.id),
      ])

    // Backup site
    const backup_json = JSON.stringify({
      site,
      pages,
      sections: sections.map((section) => ({
        ...section,
        page: section.page.id,
      })),
      symbols,
      version: 2,
    })

    await supabase.storage
      .from('sites')
      .upload(`backups/${site.url}-${site.id}.json`, backup_json)
    // S3
    try {
      const uploadBackupResponse = await fetch('/api/aws/s3/upload-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: backup_json,
          path: `backups/${site.url}-${site.id}.json`,
        }),
      })
    } catch (error) {
      console.error('--- Error ', error)
    }

    if (sections) {
      await Promise.all(
        sections.map((section) =>
          supabase.from('sections').delete().eq('id', section.id)
        )
      )
    }

    await Promise.all([
      supabase.from('pages').delete().eq('site', site.id),
      supabase.from('symbols').delete().eq('site', site.id),
      supabase.from('invitations').delete().eq('site', site.id),
      supabase.from('collaborators').delete().eq('site', site.id),
    ])

    if (delete_files) {
      let siteFiles = await getFiles('sites', site.id)
      if (siteFiles.length)
        await supabase.storage.from('sites').remove(siteFiles)

      let imageFiles = await getFiles('images', site.id)
      if (imageFiles.length)
        await supabase.storage.from('images').remove(imageFiles)
    }
    if (delete_repo) {
      const repo_deleted = await axios.post('/api/deploy/delete', { site })
      if (!repo_deleted) {
        alert(
          `Could not delete repo. Ensure Personal Access Token has the 'delete_repo' permission`
        )
      }
    }
    await supabase.from('sites').delete().eq('id', site.id)
    invalidate('app:data')
    try {
      const response = await fetch('/api/aws/site/delete-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site,
          delete_repo,
          delete_files,
        }),
      })

      const result = await response.json()
      console.log(result)
    } catch (error) {
      console.error('Error:', error)
    }
  },
}
