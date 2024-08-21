import { redirect } from '@sveltejs/kit'
import supabase_admin from '$lib/supabase/admin'
import pool from '$lib/aws/postgres-client'

/** @type {import('@sveltejs/kit').Load} */
export async function load({ url, parent }) {
  const { session } = await parent()
  const signing_up = url.searchParams.has('signup')
  const joining_server = url.pathname.includes('set-password')

  if (!session && !signing_up && !joining_server) {
    const query = 'SELECT * FROM users'
    const existing_users = await pool.query(query)
    console.log('result1 : ', existing_users)

    const initiated = existing_users?.length > 0

    if (!initiated) {
      throw redirect(303, '?signup')
    }
  } else if (session && !joining_server) {
    throw redirect(303, '/')
  }
}

/** @type {import('./$types').Actions} */
export const actions = {
  sign_in: async ({ request }) => {
    // Parse the form data
    const data = await request.formData()
    const email = data.get('email')
    const password = data.get('password')
    console.log('email : ', email)
    console.log('password : ', password)

    // Define Keycloak configuration
    const keycloakServerUrl =
      'http://localhost:8080/realms/master/protocol/openid-connect/token'
    const clientId = 'admin-client'
    const clientSecret = 'aJq58lU50Bmx8KtnHKv22HrznZZk04rG'

    // Ensure email and password are not undefined
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required.',
      }
    }

    const query = 'SELECT * FROM users WHERE email = $1'
    const result = await pool.query(query, [email])
    if (result.rowCount === 0) {
      // No rows found
      return {
        success: false,
        error: 'No matching users found.',
      }
    }
    // Prepare request body using URLSearchParams
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'openid',
      username: email.toString(), // Ensure the values are strings
      password: password.toString(),
    }).toString()

    // Request a token from Keycloak
    try {
      const tokenResponse = await fetch(keycloakServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      })

      const tokenData = await tokenResponse.json()

      if (tokenResponse.ok) {
        // Token retrieval successful
        console.log('Keycloak Token:', tokenData)
        return {
          success: true,
          error: null,
          token: tokenData.access_token, // Returning the token or processing further
        }
      } else {
        // Token retrieval failed
        console.error('Keycloak token retrieval failed:', tokenData)
        return {
          success: false,
          error:
            tokenData.error_description ||
            'Failed to retrieve token from Keycloak',
        }
      }
    } catch (error) {
      // Handle network or other unexpected errors
      console.error('Unexpected error:', error)
      return {
        success: false,
        error: 'Unexpected error occurred while retrieving token.',
      }
    }
  },
  sign_up: async ({ request, locals: { supabase } }) => {
    // Only the server owner signs up, all others are invited (i.e. auto-signed up)

    // ensure server is provisioned
    const { success, error } = await server_provisioned()
    if (!success) {
      return {
        success: false,
        error,
      }
    }

    const count = await supabase_admin
      .from('users')
      .select('count')
      .then(({ data }) => data?.[0]['count'])

    const result = await pool.query('SELECT COUNT(*) AS count FROM users')
    console.log('result3 : ', result)
    if (count > 0) {
      return {
        success: false,
        error:
          'Server already initialized. Sign in as the server owner to invite users.',
      }
    }

    const data = await request.formData()
    const email = data.get('email')
    const password = data.get('password')

    const { data: res, error: auth_error } =
      await supabase_admin.auth.admin.createUser({
        // @ts-ignore
        email: email,
        // @ts-ignore
        password: password,
        email_confirm: true,
      })

    if (auth_error) {
      return {
        success: false,
        error: auth_error.message,
      }
    } else if (res) {
      // @ts-ignore
      const { error: signin_error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!signin_error) {
        const query = 'INSERT INTO users (id,email) VALUES($1, $2)'
        const result = await pool.query(query, [res.user?.id, res.user?.email])
        console.log('result4 : ', result)
        // disable email confirmation and add user
        await supabase_admin.from('users').insert({
          id: res.user?.id,
          email: res.user?.email,
        })

        // add user to server_members as admin
        const query1 =
          'INSERT INTO server_members (user,role,admin) VALUES($1, $2, $3)'
        const result1 = await pool.query(query1, [res.user?.id, 'DEV', true])
        console.log('result5 : ', result1)
        await supabase_admin.from('server_members').insert({
          user: res.user?.id,
          role: 'DEV',
          admin: true,
        })
      }

      return {
        success: !signin_error,
        error: signin_error?.message,
      }
    }
  },
}

async function server_provisioned() {
  const { status, error } = await supabase_admin.from('sites').select()
  if (status === 0) {
    return {
      success: false,
      error: `Could not connect your Supabase backend. Ensure you've correctly connected your environment variables.`,
    }
  } else if (status === 404) {
    console.error(error)
    return {
      success: false,
      error: `Your Supabase backend is connected but incorrectly provisioned. Ensure you've run the setup schema outlined in the Docs.`,
    }
  } else if (status === 200) {
    // has sites or no sites
    return { success: true, error: null }
  } else {
    return { success: false, error: `Unknown error` }
  }
}

// Please un comment if you want to Use the below function when we go with the Postgresql.
// async function server_provisioned() {
//   try {
//     // Connect to the database
//     const client = await pool.connect()

//     try {
//       // Execute the query to select all data from the 'sites' table
//       const result = await client.query('SELECT * FROM sites')

//       // Retrieve data and status
//       const data = result.rows
//       const statusCode = result.rowCount > 0 ? 200 : 204

//       if (statusCode === 204) {
//         return {
//           success: false,
//           error: 'No sites found in the database.',
//         }
//       } else if (statusCode === 200) {
//         // Data exists or no data
//         return { success: true, error: null }
//       } else {
//         return { success: false, error: 'Unknown error' }
//       }
//     } catch (err) {
//       // Handle query execution error
//       console.error('Error executing query:', err)
//       return {
//         success: false,
//         error:
//           'Query execution failed. Ensure your database schema is correctly set up.',
//       }
//     } finally {
//       // Release the client back to the pool
//       client.release()
//     }
//   } catch (err) {
//     // Handle connection error
//     console.error('Error connecting to the database:', err)
//     return {
//       success: false,
//       error:
//         'Could not connect to the database. Check your connection configuration.',
//     }
//   }
// }
