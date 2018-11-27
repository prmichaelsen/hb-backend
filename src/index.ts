import { firebase } from './firebase';
import {
	pend,
	run,
	validate
	} from './jobs';
import {
	dateMarketCloses,
	dateMarketOpens,
	getMarketHours,
	MarketHours,
	tradier
	} from './tradier';
import { Job } from '@prmichaelsen/hb-common';
import { database } from 'firebase-admin';
import * as _ from 'lodash';
import { isNullOrUndefined } from 'util';
import {
	CronJob,
	} from 'cron';
import {
	sanitize,
	DeepImmutableObject,
	time as _time,
	ITimeString,
} from '@prmichaelsen/ts-utils';
import moment = require('moment');

const time = {
	..._time,
	toMoment(time: ITimeString) {
		return moment(time.toString(), moment.ISO_8601);
	}
}

// As an admin, the app has access to read and write all data, regardless of Security Rules
var db = firebase.database();
db.ref('meta/').once('value').then(function (snapshot: any) {
	console.log('meta', snapshot.val());
});
db.ref('meta/dateServerLastStarted').set(time.now().toString());

db.ref('jobs').on('child_added', receive);

/**
 * runs every month at midnight NYSE time
 * to update the database with market hours
 * for this month and next
 */
const onUpdateMonthlyMarketHours = async () => {
	const thisMonth = moment();
	const nextMonth = moment().add({ month: 1 });
	const marketHours: MarketHours[] = [
		...getMarketHours(await tradier.calendar({
			month: String(thisMonth.month() + 1),
			year: String(thisMonth.year()),
		})),
		...getMarketHours(await tradier.calendar({
			month: String(nextMonth.month() + 1),
			year: String(nextMonth.year()),
		})),
	];
	await db.ref('market/meta/marketHours').set(marketHours);
}
new CronJob({
	// at 00:00:00 on day-of-month 1
	cronTime: '0 0 0 1 * *',
	timeZone: 'America/New_York',
	start: true,
	onTick: onUpdateMonthlyMarketHours,
});

/**
 * runs every day at midnight NYSE time
 * to update the database with market hours
 * for today
 */
const onUpdateTodaysMarketHours = async () => {
	const marketHours: MarketHours[] = (
		await db.ref('market/meta/marketHours').once('value')
	).val() || [];
	await db.ref('market/meta').update(sanitize({
		dateMarketCloses: dateMarketCloses(marketHours),
		dateMarketOpens: dateMarketOpens(marketHours),
	}));
};
new CronJob({
	// at 00:00:00
	cronTime: '0 0 0 * * *',
	timeZone: 'America/New_York',
	start: true,
	onTick: onUpdateTodaysMarketHours,
});

/**
 * runs every second in order to update
 * the database with whether or not
 * the market is currently open.
 */
const onUpdateMarketIsOpen = async () => {
	const now = moment();
	const dateMarketCloses = moment((
		await db.ref('market/meta/dateMarketCloses').once('value')
	).val());
	const dateMarketOpens = moment((
		await db.ref('market/meta/dateMarketOpens').once('value')
	).val());
	if (!dateMarketCloses.isValid() || !dateMarketOpens.isValid()) {
		return;
	}
	const isOpen = now.isAfter(dateMarketOpens) && now.isBefore(dateMarketCloses);
	await db.ref('market/meta/isOpen').set(isOpen);
};
new CronJob({
	// every second
	cronTime: '0/1 0 0 * * *',
	timeZone: 'America/New_York',
	start: true,
	onTick: onUpdateMarketIsOpen,
});

// fire off jobs, in case they have
// never been run before
(async function seedJobs() {
	await onUpdateMonthlyMarketHours();
	await onUpdateTodaysMarketHours();
	await onUpdateMarketIsOpen();
})();

async function receive(snapshot: database.DataSnapshot) {
	const job: Job.Job = snapshot.val();
	if (job.status !== 'Sent')
		return;
	const id = snapshot.key;
	const uri = ['jobs', id].join('/');
	const data = _.cloneDeep<Job.Job>(job);
	const result: Job.Job = {
		...data,
		lifecycle: { step: 'init' },
		status: 'Received',
		dateReceived: time.now().toString(),
		id,
	}
	return await db.ref(uri).set(sanitize(result));
}

db.ref('jobs').on('child_changed', async snapshot => {
	const job: DeepImmutableObject<Job.Job> = snapshot.val();
	const key = snapshot.key;
	const id = job.id;
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