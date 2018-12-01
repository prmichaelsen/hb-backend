import {
	dateMarketCloses,
	dateMarketOpens,
	MarketHours
	} from './tradier';
import { time } from '@prmichaelsen/ts-utils';

describe('dateMarketCloses', () => {
	it('gets the next market close', () => {
		// Assemble
		const marketHours: MarketHours[] = [
			{
				open: time.parse('2018-11-08T14:30:00.000Z'),
				close: time.parse('2018-11-08T21:00:00.000Z'),
			},
			{
				open: time.parse('2018-11-09T14:30:00.000Z'),
				close: time.parse('2018-11-09T21:00:00.000Z'),
			},
			{
				open: time.parse('2018-11-12T14:30:00.000Z'),
				close: time.parse('2018-11-12T21:00:00.000Z'),
			},
		];

		// Act
		// one hour after close on 11-09
		const now =  time.parse('2018-11-09T22:00:00.000Z');
		const result =
			dateMarketCloses(marketHours, now);
		const expected = '2018-11-12T21:00:00.000Z';

		// Assert
		expect(result).toEqual(expected)
	});
});

describe('dateMarketOpens', () => {
	it('gets the next market open', () => {
		// Assemble
		const marketHours: MarketHours[] = [
			{
				open: time.parse('2018-11-08T14:30:00.000Z'),
				close: time.parse('2018-11-08T21:00:00.000Z'),
			},
			{
				open: time.parse('2018-11-09T14:30:00.000Z'),
				close: time.parse('2018-11-09T21:00:00.000Z'),
			},
			{
				open: time.parse('2018-11-12T14:30:00.000Z'),
				close: time.parse('2018-11-12T21:00:00.000Z'),
			},
		];

		// Act
		// one hour after close on 11-09
		const now =  time.parse('2018-11-09T22:00:00.000Z');
		const result =
			dateMarketOpens(marketHours, now);
		const expected = '2018-11-12T14:30:00.000Z';

		// Assert
		expect(result).toEqual(expected)
	});
});