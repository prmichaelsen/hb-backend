import { config } from './config';
import * as moment from 'moment-timezone';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import * as xml2js from 'xml2js';
import {
	IsoString,
	time,
	} from '@prmichaelsen/ts-utils';

/**
 * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * tradier
 * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * This class allows you to interface with the Tradier
 * api.
 *
 * @see tradier for what endpoints are available.
 */

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
	open: IsoString;
	/** a date and time the market closes */
	close: IsoString;
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
export function dateMarketCloses(marketHours: MarketHours[], date?: IsoString): IsoString | undefined {
	const now = date ? date : time.now();
	const closeTimes = marketHours.map(d => d.close);
	let result: IsoString | undefined;
	for (let i = 0; (i < marketHours.length - 1) && !result; i++ ) {
		const close = closeTimes[i];
		const nextClose = closeTimes[i + 1];
		if (time.isSameOrAfter(now, close) || time.isBefore(now, nextClose)) {
			result = nextClose;
		}
	}
	return result;
}

/**
 * find the next date and time the market opens
 * @param marketHours an array of market hour information
 * @param date the date to begin the search at. @default now
 * @returns the date market opens, or undefined if marketHours
 * did not include sufficient information for the date specified.
*/
export function dateMarketOpens(marketHours: MarketHours[], date?: IsoString): IsoString | undefined {
	const now = date ? date : time.now();
	const openTimes = marketHours.map(d => d.open);
	let result: IsoString | undefined;
	for (let i = 0; (i < marketHours.length - 1) && !result; i++ ) {
		const open = openTimes[i];
		const nextOpen = openTimes[i + 1];
		if (time.isSameOrAfter(now, open) && time.isBefore(now, nextOpen)) {
			result = nextOpen;
		}
	}
	return result;
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