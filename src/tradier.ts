import { config } from './config';
import {
	ITimeString,
	time
	} from '@prmichaelsen/ts-utils';
import { open } from 'fs';
import * as moment from 'moment-timezone';
import fetch from 'node-fetch';
import * as xml2js from 'xml2js';
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

export function nextOpen(calendar: Calendar): ITimeString | undefined {
	const now = moment.utc();
	const days = calendar.calendar.days[0].day
		.filter(d => d.status[0] === 'open')
		.map(d => {
			const date = d.date[0];
			const openTime = d.open[0].start[0];
			const closeTime = d.open[0].end[0];
			const open = moment.tz(date + ' ' + openTime, 'America/New_York');
			const close = moment.tz(date + ' ' + closeTime, 'America/New_York');
			return {
				open,
				close,
			}
		});
	const openTimes = days.map(d => d.open);
	const closeTimes = days.map(d => d.close);
	let result: moment.Moment;
	for (let i = 0; (i < days.length - 1) && !result; i++ ) {
		const close = closeTimes[i];
		const open = openTimes[i];
		const nextOpen = openTimes[i + 1];
		if (now.isAfter(open) && now.isBefore(close)) {
			result = now;
		}
		else if (now.isAfter(close) && now.isBefore(nextOpen)) {
			result = nextOpen;
		}
	}
	if (!result) {
		return undefined;
	}
	return time.parse(result.toISOString());
}

export const tradier = {
	async calendar(): Promise<any> {
		return new Promise(async (resolve, reject) => {
			try {
				const res = await fetch(
					baseUri + '/markets/calendar',
					{ headers: headers() }
				);
				const xml = await res.text();
				const json = await parse(xml);
				resolve(json);
			} catch (e) {
				reject(e);
			}
		});
	}
}