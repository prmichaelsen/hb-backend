import {
	market,
	MarketHours
	} from './market';
import { time } from '@prmichaelsen/ts-utils';

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

describe('dateMarketClosesNext', () => {
	describe('gets the next market close', () => {
		it('when currently closed', () => {
			// Act
			// one hour after close on 11-09
			const now = time.parse('2018-11-09T22:00:00.000Z');
			const result =
				market.util.dateMarketClosesNext(marketHours, now);
			const expected = '2018-11-12T21:00:00.000Z';

			// Assert
			expect(result).toEqual(expected)
		});
		it('when currently open', () => {
			// Act
			// one hour before close on 11-09
			const now = time.parse('2018-11-09T20:00:00.000Z');
			const result =
				market.util.dateMarketClosesNext(marketHours, now);
			const expected = '2018-11-09T21:00:00.000Z';

			// Assert
			expect(result).toEqual(expected)
		});
		it('when not enough information', () => {
			// Assemble
			// some date outside of range
			const now = time.parse('2018-11-19T20:00:00.000Z');

			// Act
			const result =
				market.util.dateMarketClosesNext(marketHours, now);

			// Assert
			expect(result).toEqual(undefined)
		});
	});
});

describe('dateMarketOpensNext', () => {
	describe('gets the next market open', () => {
		it('when currently closed', () => {
			// Act
			// one hour after close on 11-09
			const now = time.parse('2018-11-09T22:00:00.000Z');
			const result =
				market.util.dateMarketOpensNext(marketHours, now);
			const expected = '2018-11-12T14:30:00.000Z';

			// Assert
			expect(result).toEqual(expected)
		});
		it('when currently open', () => {
			// Act
			// one hour before close on 11-09
			const now = time.parse('2018-11-09T20:00:00.000Z');
			const result =
				market.util.dateMarketOpensNext(marketHours, now);
			const expected = '2018-11-12T14:30:00.000Z';

			// Assert
			expect(result).toEqual(expected)
		});
		it('when not enough information', () => {
			// Assemble
			// some date outside of range
			const now = time.parse('2018-11-19T20:00:00.000Z');

			// Act
			const result =
				market.util.dateMarketOpensNext(marketHours, now);

			// Assert
			expect(result).toEqual(undefined)
		});
	});
});

describe('isOpen', () => {
	describe('gets if market is open', () => {
		it('when currently closed', () => {
			// Assemble
			// one hour after close on 11-09
			const now = time.parse('2018-11-09T22:00:00.000Z');

			// Act
			const isOpen = market.util.isOpen(marketHours, now);

			// Assert
			expect(isOpen).toEqual(false)
		});
		it('when currently open', () => {
			// Assemble
			// one hour before close on 11-09
			const now = time.parse('2018-11-09T20:00:00.000Z');

			// Act
			const isOpen = market.util.isOpen(marketHours, now);

			// Assert
			expect(isOpen).toEqual(true)
		});
		it('when not enough information', () => {
			// Assemble
			// some date outside of range
			const now = time.parse('2018-11-19T20:00:00.000Z');

			// Act
			const isOpen = market.util.isOpen(marketHours, now);

			// Assert
			expect(isOpen).toEqual(false)
		});
	});
});