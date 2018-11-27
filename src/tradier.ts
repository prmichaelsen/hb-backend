import { config } from './config';
import {
	ITimeString,
	time as _time
	} from '@prmichaelsen/ts-utils';
import { open } from 'fs';
import * as moment from 'moment-timezone';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import * as xml2js from 'xml2js';

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

interface Hours {
	end: [string];
	start: [string];
}
interface Day {
	date: [string];
	description: [string];
	open: [Hours];
	postmarket: [Hours];
	premarket: [Hours];
	status: ['open' | 'closed'];
}
interface Calendar {
	calendar: {
		days: [ { day: Day[] }];
		month: [
			'1' | '2' | '3',
			'4', '5' | '6',
			'7', '8' | '9',
			'10', '11' | '12'
		];
		year: [string];
	}
};

export interface MarketHours {
	open: ITimeString;
	close: ITimeString;
}

export function getMarketHours(calendar: Calendar): MarketHours[] {
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

export function dateMarketCloses(marketHours: MarketHours[]): ITimeString | undefined {
	const now = moment.utc();
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

export function dateMarketOpens(marketHours: MarketHours[]): ITimeString | undefined {
	const now = moment.utc();
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

export const tradier = {
	async calendar(options?: { month: string, year: string }): Promise<any> {
		return new Promise(async (resolve, reject) => {
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