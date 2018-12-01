import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
	firebase: {
		type: process.env.firebase_type,
		project_id: process.env.firebase_project_id,
		private_key_id: process.env.firebase_private_key_id,
		private_key: String(process.env.firebase_private_key).replace(/\\n/g, '\n'),
		client_email: process.env.firebase_client_email,
		client_id: process.env.firebase_client_id,
		auth_uri: process.env.firebase_auth_uri,
		token_uri: process.env.firebase_token_uri,
		auth_provider_x509_cert_url: process.env.firebase_auth_provider_x509_cert_url,
		client_x509_cert_url: process.env.firebase_client_x509_cert_url,
		databaseUrl: process.env.firebase_databaseUrl,
	},
	tradier: {
		access_token: process.env.tradier_access_token,
	}
}