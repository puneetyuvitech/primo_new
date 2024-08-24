<script>
  import {
    PrimoPage,
    realtime_subscribe,
    locked_blocks,
  } from '@primocms/builder'
  import { browser } from '$app/environment'
  import { invalidate } from '$app/navigation'
  import { createUniqueID } from '$lib/utils'

  export let data

  const { supabase } = data

  const presence_key = createUniqueID()
  const channel = supabase.channel(`locked-blocks`, {
    config: { presence: { key: presence_key } },
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      channel.track({
        active_block: null,
      })
    }
  })

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    $locked_blocks = Object.entries(state)
      .map(([key, value]) => ({
        key,
        block_id: value[0]['active_block'],
        user: value[0]['user'],
      }))
      .filter((block) => block.key !== presence_key)
  })

  realtime_subscribe(async (res) => {
    channel.track({
      ...res,
      presence_key,
      user: {
        email: data.user.email,
      },
    })
  })

  if (browser) {
    supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sections',
          filter: `page=eq.${data.page.id}`,
        },
        () => {
          invalidate('app:data')
        },
      )
      .subscribe()
  }
</script>

<PrimoPage
  page={{
    ...data.page,
    sections: data.sections,
  }}
/>

<!-- <script>
  import {
    PrimoPage,
    realtime_subscribe,
    locked_blocks,
  } from '@primocms/builder'
  import { browser } from '$app/environment'
  import { invalidate } from '$app/navigation'
  import { createUniqueID } from '$lib/utils'

  export let data

  // WebSocket server URL (replace with your actual WebSocket server URL)
  const WEBSOCKET_URL = 'ws://localhost:5173'
  let socket
  console.log('----- WEB-SOCKET')
  const presence_key = createUniqueID()

  // Initialize WebSocket connection
  function initializeWebSocket() {
    socket = new WebSocket(WEBSOCKET_URL)
    console.log('-------- socket', socket)
    socket.onopen = () => {
      console.log('WebSocket connected')
      // Send initial presence tracking data
      socket.send(
        JSON.stringify({
          type: 'subscribe',
          presence_key,
          user: {
            email: data.user.email,
          },
          active_block: null,
        }),
      )
    }

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)

      // Handle presence sync event
      if (message.type === 'presence-sync') {
        const state = message.presenceState
        $locked_blocks = Object.entries(state)
          .map(([key, value]) => ({
            key,
            block_id: value.active_block,
            user: value.user,
          }))
          .filter((block) => block.key !== presence_key)
      }

      // Handle PostgreSQL update event
      if (
        message.type === 'postgres-update' &&
        message.page_id === data.page.id
      ) {
        invalidate('app:data')
      }
    }

    socket.onclose = () => {
      console.log('WebSocket disconnected, attempting to reconnect...')
      setTimeout(initializeWebSocket, 1000) // Reconnect after 1 second
    }

    socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  // Initialize WebSocket connection on client-side
  if (browser) {
    initializeWebSocket()
  }

  // Replace realtime_subscribe logic with WebSocket
  realtime_subscribe(async (res) => {
    if (socket.readyState === WebSocket.OPEN) {
      console.log('----  Websocket open')
      socket.send(
        JSON.stringify({
          ...res,
          presence_key,
          user: {
            email: data.user.email,
          },
        }),
      )
    }
  })

  // WebSocket for database changes
  if (browser) {
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)

      if (
        message.type === 'postgres-update' &&
        message.page_id === data.page.id
      ) {
        invalidate('app:data')
      }
    })
  }
</script>

<PrimoPage
  page={{
    ...data.page,
    sections: data.sections,
  }}
/> -->
