import { firebase } from './firebase';
import {
	Job,
	pend,
	run,
	validate
	} from './jobs';
import { database } from 'firebase-admin';
import * as _ from 'lodash';
import { isNullOrUndefined } from 'util';
import {
	sanitize,
	DeepImmutableObject,
} from '@prmichaelsen/hb-common';

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
	const data = _.cloneDeep<Job>(job);
	const result: Job = {
		...data,
		step: 'init',
		status: 'Received',
		dateReceived: Date().toString(),
		id,
	}
	return await db.ref(uri).set(sanitize(result));
}

db.ref('jobs').on('child_changed', async snapshot => {
	const job: DeepImmutableObject<Job> = snapshot.val();
	const key = snapshot.key;
	const id = job.id;
	const uri = ['jobs', key].join('/');
	const data = _.cloneDeep<Job>(job);
	switch (job.status) {
		case 'Received': {
			const result: Job = { ...data, status: 'Validating' };
			return await db.ref(uri).set(sanitize(result));
		}
		case 'Validating':
			if (isNullOrUndefined(job.userId)) {
				const result: Job = {
					...data, status: 'Failed',
					message: 'No userId is associated with this job.',
				};
				return await db.ref(uri).set(sanitize(result));
			}
			return db.ref(uri).set(sanitize(await validate(job)));
		case 'Ready': {
			const result: Job = {
				...data, status: 'Queued',
			};
			return await db.ref(uri).set(sanitize(result));
		}
		case 'Queued': {
			const result: Job = {
				...data, status: 'Running',
			};
			return await db.ref(uri).set(sanitize(result));
		}
		case 'Running':
			return await db.ref(uri).set(sanitize(await run(job)));
		case 'Success':
			if (isNullOrUndefined(job.outcome)) {
				const result: Job = {
					...data,
					outcome: 'Succeeded',
					dateCompleted: Date().toString(),
				};
				return await db.ref(uri).set(sanitize(result));
			}
			return;
		case 'Failed':
			if (isNullOrUndefined(job.outcome)) {
				const result: Job = {
					...data,
					outcome: 'Failed',
					dateCompleted: Date().toString(),
				};
				return await db.ref(uri).set(sanitize(result));
			}
			return;
		case 'Waiting':
			return;
		case 'Pending':
			const result: Job = {
				...(await pend(data)),
				datePending: Date().toString(),
			};
			return await db.ref(uri).set(sanitize(result));
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