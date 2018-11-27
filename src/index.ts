import { firebase } from './firebase';
import {
	pend,
	run,
	validate
	} from './jobs';
import { Job } from '@prmichaelsen/hb-common';
import { database } from 'firebase-admin';
import * as _ from 'lodash';
import * as moment from 'moment';
import { isNullOrUndefined } from 'util';
import {
	sanitize,
	DeepImmutableObject,
	time,
} from '@prmichaelsen/ts-utils';


/** initialize the node-cron jobs */
require('./cron');

/** db reference for firebase connection */
const db = firebase.database();
db.ref('meta/').once('value').then(function (snapshot: any) {
	console.log('meta', snapshot.val());
});
db.ref('meta/dateServerLastStarted').set(time.now().toString());

/**
 * handle newly created jobs by setting some metadata
 */
db.ref('jobs').on('child_added', async snapshot => {
	const job: Job.Job = snapshot.val();
	if (job.status !== 'Sent')
		return;
	const id = snapshot.key;
	const uri = ['jobs', id].join('/');
	const result: Job.Job = {
		...job,
		lifecycle: { step: 'init' },
		status: 'Received',
		dateReceived: time.now().toString(),
		id,
	}
	return await db.ref(uri).set(sanitize(result));
});

/** fires any time a job has been updated in any way */
db.ref('jobs').on('child_changed', async snapshot => {
	const job: DeepImmutableObject<Job.Job> = snapshot.val();
	const key = snapshot.key;
	const uri = ['jobs', key].join('/');
	const data = _.cloneDeep<Job.Job>(job);
	switch (job.status) {
		case 'Received': {
			const result: Job.Job = { ...data, status: 'Validating' };
			return await db.ref(uri).set(sanitize(result));
		}
		case 'Validating':
			if (isNullOrUndefined(job.userId)) {
				const result: Job.Job = {
					...data, status: 'Failed',
					message: 'No userId is associated with this job.',
				};
				return await db.ref(uri).set(sanitize(result));
			}
			return db.ref(uri).set(sanitize(await validate(job)));
		case 'Ready': {
			const result: Job.Job = {
				...data, status: 'Queued',
			};
			return await db.ref(uri).set(sanitize(result));
		}
		case 'Queued': {
			const result: Job.Job = {
				...data, status: 'Running',
			};
			return await db.ref(uri).set(sanitize(result));
		}
		case 'Running':
			return await db.ref(uri).set(sanitize(await run(job)));
		case 'Success':
			if (isNullOrUndefined(job.outcome)) {
				const result: Job.Job = {
					...data,
					outcome: 'Succeeded',
					dateCompleted: time.now().toString(),
				};
				return await db.ref(uri).set(sanitize(result));
			}
			return;
		case 'Failed':
			if (isNullOrUndefined(job.outcome)) {
				const result: Job.Job = {
					...data,
					outcome: 'Failed',
					dateCompleted: time.now().toString(),
				};
				return await db.ref(uri).set(sanitize(result));
			}
			return;
		case 'Waiting':
			return;
		case 'Pending':
			const result: Job.Job = {
				...(await pend(data)),
				datePending: time.now().toString(),
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