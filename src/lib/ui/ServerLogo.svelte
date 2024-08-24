<script>
  import logo from '$lib/assets/server-logo.svg'
  import { browser } from '$app/environment'
  import { page } from '$app/stores'

  const { supabase } = $page.data

  let image_url = logo
  if (browser && supabase) {
    supabase.storage
      .from('images')
      .download(`server-logo.svg`)
      .then(({ data, error }) => {
        if (data) {
          var reader = new FileReader()
          reader.onload = function () {
            image_url = reader.result
          }
          reader.readAsDataURL(data)
        } else {
          console.log('------- image preview error', error)
        }
      })
    fetch('/api/aws/s3/download-preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: `images/server-logo.svg` }),
    })
      .then((response) => response.json())
      .then(({ data, error }) => {
        if (error) {
          console.error('Error downloading file:', error)
        } else {
          image_url = data
        }
      })
      .catch((err) => console.error('Fetch error:', err))
  }
</script>

<div class="logo">
  <!-- svelte-ignore a11y-missing-attribute -->
  <img src={image_url} />
</div>

<style>
  .logo {
    width: 100%;
  }
  img {
    width: 100%;
  }
</style>
