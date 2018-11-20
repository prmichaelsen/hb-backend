import { serviceAccount } from '../config/ServiceAccount';
import * as admin from 'firebase-admin';

// As an admin, the app has access to read and write all data, regardless of Security Rules
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
	databaseURL: 'https://hb-prmichaelsen.firebaseio.com'
});

export const firebase = admin;
export const db = admin.database();