import { config } from './config';
import * as admin from 'firebase-admin';

// As an admin, the app has access to read and write all data, regardless of Security Rules
admin.initializeApp({
	credential: admin.credential.cert(config.firebase as admin.ServiceAccount),
	databaseURL: 'https://hb-prmichaelsen.firebaseio.com'
});

export const firebase = admin;
export const db = admin.database();