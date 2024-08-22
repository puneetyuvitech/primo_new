import Keycloak from 'keycloak-js'
import {
  KEYCLOAK_URL,
  KEYCLOAK_REALM,
  KEYCLOAK_CLIENT_ID,
} from '$env/static/private'
console.log('---------KEYCLOAK_URL', KEYCLOAK_URL)
const keycloak = new Keycloak({
  url: KEYCLOAK_URL,
  realm: KEYCLOAK_REALM,
  clientId: KEYCLOAK_CLIENT_ID,
})

export default keycloak
