import { firebase } from './firebase';
import {
	IsoString,
	time
	} from '@prmichaelsen/ts-utils';

export const market = {
	db: {
		meta: {
			async dateMarketClosesNext() {
				try {
					return time.parse((
						await firebase.database()
							.ref('market/meta/dateMarketClosesNext')
							.once('value')
					).val());
				} catch (e) {
					throw e;
				}
			},
			async dateMarketOpensNext() {
				try {
					return time.parse((
						await firebase.database()
							.ref('market/meta/dateMarketOpensNext')
							.once('value')
					).val());
				} catch (e) {
					throw e;
				}
			},
			async isOpen() {
				try {
					return (await firebase.database()
						.ref('market/meta/isOpen')
						.once('value')
					).val() === true;
				} catch (e) {
					throw e;
				}
			},
		}
	},
	util: {
		dateMarketClosesNext,
		dateMarketOpensNext,
		isOpen,
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
 * find the next date and time the market closes
 * @param marketHours an array of market hour information
 * @param date the date to begin the search at. @default now
 * @returns the date market closes, or undefined if marketHours
 * did not include sufficient information for the date specified.
*/
function dateMarketClosesNext(
	marketHours: MarketHours[],
	date: IsoString = time.now()
): IsoString | undefined {
	const closeTimes = marketHours.map(d => d.close);
	let result: IsoString | undefined;
	for (let i = 0; (i < marketHours.length - 1) && !result; i++ ) {
		const close = closeTimes[i];
		const nextClose = closeTimes[i + 1];
		if (time.isSameOrAfter(date, close) && time.isBefore(date, nextClose)) {
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
function dateMarketOpensNext(
	marketHours: MarketHours[],
	date: IsoString = time.now()
): IsoString | undefined {
	const openTimes = marketHours.map(d => d.open);
	let result: IsoString | undefined;
	for (let i = 0; (i < marketHours.length - 1) && !result; i++ ) {
		const open = openTimes[i];
		const nextOpen = openTimes[i + 1];
		if (time.isSameOrAfter(date, open) && time.isBefore(date, nextOpen)) {
			result = nextOpen;
		}
	}
	return result;
}

/**
 * find if the market is open for a given date
 * @param marketHours an array of market hour information
 * @param date the date to search for. @default now
 * @returns the market hours for date, or undefined if marketHours
 * did not include sufficient information for the date specified.
*/
function isOpen(
	marketHours: MarketHours[],
	date: IsoString = time.now()
): boolean {
	return marketHours.some(day =>
		time.isAfter(date, day.open) &&
		time.isBefore(date, day.close)
	);
}