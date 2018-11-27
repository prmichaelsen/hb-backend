import { firebase } from './firebase';
import {
	dateMarketCloses,
	dateMarketOpens,
	getMarketHours,
	MarketHours,
	tradier
	} from './tradier';
import {
	sanitize,
	time
	} from '@prmichaelsen/ts-utils';
import { CronJob } from 'cron';
import moment = require("moment");

const db = firebase.database();

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
const updateMonthlyMarketHours = new CronJob({
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
const updateTodaysMarketHours = new CronJob({
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
	const now = time.now();
	const dateMarketCloses = time.parseDangerously((
		await db.ref('market/meta/dateMarketCloses').once('value')
	).val());
	const dateMarketOpens = time.parseDangerously((
		await db.ref('market/meta/dateMarketOpens').once('value')
	).val());
	if (!dateMarketCloses || !dateMarketOpens)
		return;
	const isOpen =
		time.isAfter(now, dateMarketOpens)
		&& time.isBefore(now, dateMarketCloses);
	await db.ref('market/meta/isOpen').set(isOpen);
};
const updateMarketIsOpen = new CronJob({
	// every second
	cronTime: '* * * * * *',
	timeZone: 'America/New_York',
	start: true,
	onTick: onUpdateMarketIsOpen,
});

/**
 * this timestamp will be updated every second
 * to allow for verification the server is up.
 */
const onUpdateHealthCheck = async () => {
	db.ref('meta/dateServerLastUp').set(time.now());
}
const updateHealthCheck = new CronJob({
	// every second
	cronTime: '* * * * * *',
	start: true,
	onTick: onUpdateHealthCheck,
});

// fire off some jobs that require each other
// in the correct order, in case they have
// never been run before
(async function seedJobs() {
	await onUpdateMonthlyMarketHours();
	await onUpdateTodaysMarketHours();
	await onUpdateMarketIsOpen();
})();