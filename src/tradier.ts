import { config } from './config';
import {
	ITimeString,
	time as _time
	} from '@prmichaelsen/ts-utils';
import * as moment from 'moment-timezone';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import * as xml2js from 'xml2js';

/**
 * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * tradier
 * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * This class allows you to interface with the Tradier
 * api.
 *
 * @see tradier for what endpoints are available.
 */

const time = {
	..._time,
	toMoment(time: ITimeString) {
		return moment(time.toString(), moment.ISO_8601);
	}
}

const baseUri = 'https://api.tradier.com/v1';
const token = config.tradier.access_token;
function headers() {
	return {
		Authorization: 'Bearer ' + token,
	}
}

/**
 * parse an xml response string and generate
 * a javascript object
 */
function parse(xml: string) {
	return new Promise((resolve, reject) => {
		xml2js.parseString(
			xml,
			{ preserveChildrenOrder: true },
			(err, result) => {
				if (err)
					reject(err);
				resolve(result)
			});
	});
};

/** a namespace for storing Tradier API types */
export namespace Tradier {
	export namespace Calendar {
		export interface Hours {
			end: [string];
			start: [string];
		}
		export interface Day {
			date: [string];
			description: [string];
			open: [Hours];
			postmarket: [Hours];
			premarket: [Hours];
			status: ['open' | 'closed'];
		}
		/** the expected response body */
		export interface Response {
			calendar: {
				days: [{ day: Day[] }];
				month: [
					'1' | '2' | '3',
					'4', '5' | '6',
					'7', '8' | '9',
					'10', '11' | '12'
				];
				year: [string];
			}
		}
	}
}

/** an open and close time for a given day */
export interface MarketHours {
	/** a date and time the market opens */
	open: ITimeString;
	/** a date and time the market closes */
	close: ITimeString;
}

/**
 * reduce the calendar api response to an array of open and close times
 * by day. Market hours only includes days in which the market is open.
*/
export function getMarketHours(calendar: Tradier.Calendar.Response): MarketHours[] {
	return calendar.calendar.days[0].day
		.filter(d => d.status[0] === 'open')
		.map(d => {
			const date = d.date[0];
			const openTime = d.open[0].start[0];
			const closeTime = d.open[0].end[0];
			const open = moment.tz(date + ' ' + openTime, 'America/New_York');
			const close = moment.tz(date + ' ' + closeTime, 'America/New_York');
			return {
				open: time.parse(open.toISOString()),
				close: time.parse(close.toISOString()),
			}
		});
}

/**
 * find the next date and time the market closes
 * @param marketHours an array of market hour information
 * @param date the date to begin the search at. @default now
 * @returns the date market closes, or undefined if marketHours
 * did not include sufficient information for the date specified.
*/
export function dateMarketCloses(marketHours: MarketHours[], date?: ITimeString): ITimeString | undefined {
	const now = date ? time.toMoment(date) : moment.utc();
	const closeTimes = marketHours.map(d => d.close);
	let result: moment.Moment;
	for (let i = 0; (i < marketHours.length - 1) && !result; i++ ) {
		const close = time.toMoment(closeTimes[i]);
		const nextClose = time.toMoment(closeTimes[i + 1]);
		if (now.isSameOrAfter(close) && now.isBefore(nextClose)) {
			result = nextClose;
		}
	}
	if (!result) {
		return undefined;
	}
	return time.parse(result.toISOString());
}

/**
 * find the next date and time the market opens
 * @param marketHours an array of market hour information
 * @param date the date to begin the search at. @default now
 * @returns the date market opens, or undefined if marketHours
 * did not include sufficient information for the date specified.
*/
export function dateMarketOpens(marketHours: MarketHours[], date?: ITimeString): ITimeString | undefined {
	const now = date ? time.toMoment(date) : moment.utc();
	const openTimes = marketHours.map(d => d.open);
	let result: moment.Moment;
	for (let i = 0; (i < marketHours.length - 1) && !result; i++ ) {
		const open = time.toMoment(openTimes[i]);
		const nextOpen = time.toMoment(openTimes[i + 1]);
		if (now.isAfter(open) && now.isBefore(nextOpen)) {
			result = nextOpen;
		}
	}
	if (!result) {
		return undefined;
	}
	return time.parse(result.toISOString());
}

/** a client for interacting with the tradier api */
export const tradier = {
	/**
	 * gets the market calendar for the month and year
	 * you specify.
	 */
	async calendar(options?: { month: string, year: string }): Promise<Tradier.Calendar.Response> {
		return new Promise<any>(async (resolve, reject) => {
			try {
				const uri = baseUri + '/markets/calendar' + (options ?
					'?' + new URLSearchParams(options).toString() : '');
				const res = await fetch(
					uri,
					{ headers: headers() }
				);
				if (res.status === 200) {
					const xml = await res.text();
					const json = await parse(xml);
					resolve(json);
				} else {
					reject(res.statusText);
				}
			} catch (e) {
				reject(e);
			}
		});
	}
}