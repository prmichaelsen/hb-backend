import { firebase } from './firebase';
import {
	Job,
	pend,
	run,
	validate
	} from './jobs';
import { isSet } from './utils';
import { database } from 'firebase-admin';
import * as _ from 'lodash';
import { isNullOrUndefined } from 'util';

// As an admin, the app has access to read and write all data, regardless of Security Rules
var db = firebase.database();
db.ref('meta/').once('value').then(function (snapshot: any) {
	console.log('meta', snapshot.val());
});
db.ref('meta/dateServerLastStarted').set(Date().toString());

db.ref('jobs').on('child_added', receive);

async function receive(snapshot: database.DataSnapshot) {
	const job: Job = snapshot.val();
	if (job.status !== 'Sent')
		return;
	const id = snapshot.key;
	const uri = ['jobs', id].join('/');
	const data: Job = { ...job };
	await db.ref(uri).set(((): Job => ({
		...data, status: 'Received',
		step: 'init', dateReceived: Date().toString(),
		id,
	}))());
}

db.ref('jobs').on('child_changed', async snapshot => {
	const job: Job = snapshot.val();
	const key = snapshot.key;
	const id = job.id;
	const uri = ['jobs', key].join('/');
	// TODO should probably clone deep this
	const data: Job = { ...job };
	switch (job.status) {
		// case 'Sent': {
		// 	receive(snapshot);
		// 	return;
		// }
		case 'Received': {
			return await db.ref(uri).set(((): Job => ({
				...data, status: 'Validating',
			}))());
		}
		case 'Validating':
			if (isNullOrUndefined(job.userId)) {
				return await db.ref(uri).set(((): Job => ({
					...data, status: 'Failed',
					message: 'No userId is associated with this job.',
				}))());
			}
			return db.ref(uri).set(await validate(job));
		case 'Ready': {
			return await db.ref(uri).set(((): Job => ({
				...data, status: 'Queued',
			}))());
		}
		case 'Queued': {
			return await db.ref(uri).set(((): Job => ({
				...data, status: 'Running',
			}))());
		}
		// TODO apparently you can update entire
		// collections in one call, will need to revisit
		// all this to do that instead
		case 'Running':
			return await db.ref(uri).set(await run(job));
		case 'Success':
			if (isNullOrUndefined(job.outcome)) {
				await db.ref(uri).set(((): Job => ({
					...data,
					outcome: 'Succeeded',
					dateCompleted: Date().toString(),
				}))());
			}
			return;
		case 'Failed':
			if (isNullOrUndefined(job.outcome))
				await db.ref(uri).set(((): Job => ({
					...data,
					outcome: 'Failed',
					dateCompleted: Date().toString(),
				}))());
			return;
		case 'Waiting':
			return;
		case 'Pending':
			await db.ref(uri).set(await (async (): Promise<Job> => ({
				...(await pend(data)),
				datePending: Date().toString(),
			}))());
			return;
		case 'Paused':
			return;
		case 'Problem':
			return;
		case 'Sent':
			return;
		case 'Blocked':
			return;
		default:
			const _exhaustiveSwitch: never = job.status;
	}
});