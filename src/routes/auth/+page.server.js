import { redirect } from '@sveltejs/kit'
import supabase_admin from '$lib/supabase/admin'
import pool from '$lib/aws/postgres-client'

/** @type {import('@sveltejs/kit').Load} */
export async function load({ url, parent }) {
  const { session } = await parent()
  const signing_up = url.searchParams.has('signup')
  const joining_server = url.pathname.includes('set-password')

  if (!session && !signing_up && !joining_server) {
    const query = 'SELECT COUNT(*) FROM users'
    const existing_users = await pool.query(query)

    const initiated = existing_users.rows[0].count > 0
    console.log('initiated : ', initiated)

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
      const logInResponse = await fetch(keycloakServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      })

      const response = await logInResponse.json()

      if (logInResponse.ok) {
        return {
          success: true,
          error: null,
          token: response.access_token,
        }
      } else {
        return {
          success: false,
          error: response.error_description || 'Failed to login the user',
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Unexpected error occurred while login the user.',
      }
    }
  },
  sign_up: async ({ request }) => {
    // ensure server is provisioned
    const { success, error } = await server_provisioned()
    if (!success) {
      return {
        success: false,
        error,
      }
    }

    const count = await pool.query('SELECT COUNT(*) AS count FROM users')
    if (count > 0) {
      return {
        success: false,
        error:
          'Server already initialized. Sign in as the server owner to invite users.',
      }
    }

    const data = await request.formData()
    const email = data.get('email')
    const username = data.get('email')
    const password = data.get('password')

    const keycloakServerUrl =
      'http://localhost:8080/realms/master/protocol/openid-connect/token'
    const clientId = 'admin-client'
    const clientSecret = 'aJq58lU50Bmx8KtnHKv22HrznZZk04rG'

    // Prepare request body using URLSearchParams
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }).toString()

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
        const keycloakCreateUserUrl =
          'http://localhost:8080/admin/realms/master/users'
        var userId

        try {
          const responseCreateUser = await fetch(keycloakCreateUserUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: username,
              email: email,
              emailVerified: 'true',
              enabled: true,
            }),
          })

          if (!responseCreateUser.ok) {
            const error = await responseCreateUser.text()
            throw new Error(
              `Error creating user: ${responseCreateUser.statusText} (${responseCreateUser.status}) - ${error}`
            )
          }
          const locationHeader = responseCreateUser.headers.get('location')
          if (locationHeader) {
            userId = locationHeader.split('/').pop() // Extract the user ID from the URL
          } else {
            console.error('Location header not found in the response.')
          }
          console.log('User created successfully')
        } catch (error) {
          console.error('Failed to create user:', error)
        }

        const keycloakAddPasswordUrl = `http://localhost:8080//admin/realms/master/users/${userId}/reset-password`
        const responseAddPassword = await fetch(keycloakAddPasswordUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'password',
            value: password,
            temporary: false,
          }),
        })

        // Prepare request body using URLSearchParams
        const body = new URLSearchParams({
          grant_type: 'password',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'openid',
          username: email.toString(), // Ensure the values are strings
          password: password.toString(),
        }).toString()

        const logInResponse = await fetch(keycloakServerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body,
        })

        console.log('tokenResponse-login-after-signup : ', logInResponse)

        const query = 'INSERT INTO users (id,email) VALUES($1, $2)'
        const result = await pool.query(query, [userId, email])

        // add user to server_members as admin
        const query1 =
          'INSERT INTO server_members ("user",role,admin) VALUES($1, $2, $3)'
        const result1 = await pool.query(query1, [userId, 'DEV', true])
        console.log('result5 : ', result1)
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
}

async function server_provisioned() {
  try {
    // Connect to the database
    const client = await pool.connect()

    try {
      // Execute the query to select all data from the 'sites' table
      const result = await client.query('SELECT * FROM sites')

      // Retrieve data and status
      const data = result.rows
      const statusCode = result.rowCount > 0 ? 200 : 204

      if (statusCode === 204) {
        return {
          success: false,
          error: 'No sites found in the database.',
        }
      } else if (statusCode === 200) {
        // Data exists or no data
        return { success: true, error: null }
      } else {
        return { success: false, error: 'Unknown error' }
      }
    } catch (err) {
      // Handle query execution error
      console.error('Error executing query:', err)
      return {
        success: false,
        error:
          'Query execution failed. Ensure your database schema is correctly set up.',
      }
    } finally {
      // Release the client back to the pool
      client.release()
    }
  } catch (err) {
    // Handle connection error
    console.error('Error connecting to the database:', err)
    return {
      success: false,
      error:
        'Could not connect to the database. Check your connection configuration.',
    }
  }
}
