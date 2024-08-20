import { SupabaseClient, Session } from '@supabase/supabase-js'
import { Database } from './DatabaseDefinitions'
import keycloak from '$lib/aws/auth'

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient<Database>
			getSession(): Promise<Session | null>
		}
		interface PageData {
			session: Session | null
		}
		// interface Error {}
		// interface Platform {}
	}
}

// declare global {
// 	namespace App {
// 	  interface Locals {
// 		keycloak: KeycloakInstance;
// 		getSession(): Promise<{
// 		  token: string;
// 		  userInfo: any; 
// 		} | null>;
// 	  }
// 	  interface PageData {
// 		session: {
// 		  token: string;
// 		  userInfo: any; 
// 		} | null;
// 	  }
// 	}
//   }