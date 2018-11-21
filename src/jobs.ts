import get from './get';
import { delay } from './utils';
import * as fetch from 'node-fetch';
import {
	rh,
	} from './helpers';
import {
	Options,
	} from 'robinhood';
import {
	isNullOrUndefined, promisify,
	} from 'util';
import _ = require('lodash');

type Status =
	/**
	 * job has not been acked by server.
	 * job has no id or job no.
	 */
	'Sent'
	/**
	 * job has been acked by server.
	 * job has id and job no.
	 */
	| 'Received'
	/** job is being validated */
	| 'Validating'
	/** job is blocked by another job */
	| 'Blocked'
	/** job requires user to fix it */
	| 'Problem'
	/** job is waiting on new user input */
	| 'Waiting'
	/** job is listening to 3rd party api  */
	| 'Pending'
	/** job is currently doing work */
	| 'Running'
	/** job was doing work, but has been paused */
	| 'Paused'
	/** job is Ready to do work */
	| 'Ready'
	/** job will do work after currently running job */
	| 'Queued'
	/** job has irrevocably failed */
	| 'Failed'
	/** job is complete */
	| 'Success'
;

enum Type {
	Daytrade = 'Daytrade',
	DaytradeBuy = 'DaytradeBuy',
	Quote = 'Quote',
	Instrument = 'Instrument',
}

interface JobOptions {
	/** cron time or 'once' */
	frequency?: string;
}
interface JobMeta {
	status: Status;
	frequency: string;
	progress: number;
	userId: string;
	id: string;
	no?: string;
	dateToStart?: string;
	dateToStop?: string;
	message?: string;
	body?: string;
	dateReceived?: string;
	dateCompleted?: string;
	datePending?: string;
	outcome?: 'Failed' | 'Succeeded';
	output?: {},

}
export type JobDetails = ({
	type: Type.Daytrade,
	/** tracks which step the job is on */
	step: 'init',
	/** the original, unmodified payload */
	payload: {
		symbol: string;
		limit: number;
		stopLoss: number;
		spendAmount: number;
	},
	/** data the job tracks through its
	 * lifecycle */
	data?: {
		/** the buy order id */
		orderId?: string;
	},
} | {
	type: Type.Daytrade,
	/** tracks which step the job is on */
	step: 'sell',
	/** the original, unmodified payload */
	payload: {
		symbol: string;
		limit: number;
		stopLoss: number;
		spendAmount: number;
	},
	/** data the job tracks through its
	 * lifecycle */
	data: {
		/** the buy order id */
		orderId: string;
	},
} | {
	type: Type.Quote,
	step: 'init',
	payload: {
		symbol: string;
	},
} | {
	type: Type.Instrument,
	step: 'init',
	payload: {
		symbol: string;
	},
} | {
	type: Type.DaytradeBuy,
	step: 'init',
	payload: {
		limit: number;
		spendAmount: number;
		symbol: string;
		instrumentUrl: string;
	},
});
export type Job =
	& JobOptions
	& JobMeta
	& Readonly<JobDetails>;

function setJob(job: JobDetails & JobOptions): Job {
	return {
		userId: '',
		frequency: 'once',
		...job,
		status: 'Sent',
		id: '',
		progress: 0,
	}
}

export const run = async (job: Readonly<Job>): Promise<Job> => {
	switch (job.type) {
		case Type.Daytrade: {
			const data = { ...job };
			const {
				spendAmount: spendAmountStr, stopLoss,
				symbol, limit
			} = job.payload;
			const spendAmount = parseInt(String(spendAmountStr), 10);
			//#region Metadata
			const api = await rh(job);
			const instrumentsBody = await new Promise<any>(async (resolve, reject) => {
				api.instruments(symbol, (err, res, body) => {
					if (err)
						reject(); // TODO better handling
					if (body)
						resolve(body);
				});
			});
			const quoteDataBody = await new Promise<any>(async (resolve, reject) => {
				api.quote_data(symbol, (err, res, body) => {
					if (err)
						reject(); // TODO better handling
					if (body)
						resolve(body);
				});
			});
			const bid_price = get(
				quoteDataBody, o => o.results,
				o => o[0], o => parseFloat(o.bid_price) || parseFloat(o.last_trade_price),
			);
			const url = get(instrumentsBody, o => o.results, o => o[0], o => o.url);
			const quantity = Math.floor(spendAmount / bid_price);
			//#endregion Metadata
			switch (job.step) {
				/** place the buy order */
				case 'init': {
					const buyOptions: Options.BuySellOptions = {
						bid_price,
						quantity,
						time: 'gfd' as any,
						trigger: 'immediate' as any,
						type: 'market' as any,
						instrument: {
							symbol,
							url,
						}
					};
					const buyBody = await new Promise<any>(async (resolve, reject) => {
						api.place_buy_order(buyOptions, (err, res, body) => {
							if (err)
								reject(); // TODO better handling
							if (body)
								resolve(body);
						});
					});
					data.body = buyBody;
					const orderId = buyBody.id;
					if (isNullOrUndefined(orderId)) {
						data.status = 'Failed';
						data.message = buyBody.detail || 'No order id was returned.';
					}
					else {
						data.status = 'Pending';
						data.data = { orderId };
						data.step = 'sell';
					}
					return data;
				}
				/** once bought, place the stop limit sell order */
				case 'sell': {
					const api = await rh(job);
					const sellOptions: Options.BuySellOptions = {
						bid_price,
						quantity,
						time: 'gfd' as any,
						// TODO robinhood ts this correctly
						trigger: 'stop' as any,
						type: 'limit' as any,
						instrument: {
							symbol,
							url,
						}
					};
					// TODO robinhood ts this correctly
					const options: any = sellOptions;
					options.stop_price = stopLoss;
					const body = await new Promise<any>((resolve, reject) => {
						api.place_sell_order(sellOptions, (err, res, body) => {
							if (err)
								reject(); // TODO better handling
							if (body)
								resolve(body);
						});
					});
					data.body = body;
					const orderId = body.id;
					if (isNullOrUndefined(orderId)) {
						data.status = 'Failed';
						data.message = body.detail || 'No order id was returned.';
					}
					else {
						data.status = 'Success';
					}
					return data;
				}
				default:
					const _exhaustiveSwitch: never = job;
			}
		}
		case Type.Quote: {
			const data = { ...job };
			const api = await rh(job);
			return await new Promise<Job>((resolve, reject) => {
				api.quote_data(job.payload.symbol, (err, resp, body) => {
					if (err) {
						resolve({
							...data,
							message: err.toString(),
							status: 'Failed',
						});
					}
					resolve({
						...data,
						body,
						progress: 1,
						status: 'Success',
					});
				});
			});
		}
		case Type.Instrument: {
			const data = { ...job };
			const api = await rh(job);
			return await new Promise<Job>((resolve, reject) => {
				api.instruments(job.payload.symbol, (err, resp, body) => {
					if (err) {
						resolve({
							...data,
							message: err.toString(),
							status: 'Failed',
						});
					}
					resolve({
						...data,
						body,
						progress: 1,
						status: 'Success',
					});
				});
			});
		}
		case Type.DaytradeBuy: {
			const data = { ...job };
			const api = await rh(job);
			const {
				spendAmount, symbol,
				instrumentUrl, limit
			} = job.payload;
			const quantity = Math.floor(spendAmount / limit);
			return await new Promise<Job>((resolve, reject) => {
				api.place_buy_order({
					time: 'gfd' as any,
					trigger: 'immediate' as any,
					type: 'limit' as any,
					quantity,
					bid_price: limit,
					instrument: {
						url: instrumentUrl,
						symbol,
					}
				}, (err, resp, body) => {
					if (err) {
						resolve({
							...data,
							message: err.toString(),
							status: 'Failed',
						});
					}
					resolve({
						...data,
						body: body,
						progress: 1,
						status: 'Success',
					});
				});
			});
		}
		default:
			const _exhaustiveSwitch: never = job;
	}
};

export const validate = async (job: Readonly<Job>): Promise<Job> => {
	const data = { ...job };
	switch (job.type) {
		case Type.Daytrade: {
			if (isNullOrUndefined(job.payload.limit)) {
				return {
					...data,
					status: 'Problem',
					message: 'Limit must be present.'
				};
			}
			if (isNullOrUndefined(job.payload.spendAmount)) {
				return ({
					...data,
					status: 'Problem',
					message: 'Spend Amount must be present.'
				});
			}
			if (isNullOrUndefined(job.payload.stopLoss)) {
				return ({
					...data,
					status: 'Problem',
					message: 'Stop Loss must be present.'
				});
			}
			if (isNullOrUndefined(job.payload.symbol)) {
				return ({
					...data,
					status: 'Problem',
					message: 'Symbol must be present.'
				});
			}
			return ({ ...data, status: 'Ready' });
		}
		case Type.Quote: {
			if (isNullOrUndefined(job.payload.symbol)) {
				return ({
					...data,
					status: 'Problem',
					message: 'Symbol must be present.'
				});
			}
			return ({ ...data, status: 'Ready' });
		}
		case Type.Instrument: {
			if (isNullOrUndefined(job.payload.symbol)) {
				return ({
					...data,
					status: 'Problem',
					message: 'Symbol must be present.'
				});
			}
			return ({ ...data, status: 'Ready' });
		}
		default:
			return ({ ...data, status: 'Ready' });
	}
};

export const pend = async (job: Readonly<Job>): Promise<Job> => {
	switch (job.type) {
		case Type.Daytrade: {
			switch(job.step) {
				case 'init': {
					return job;
				}
				case 'sell': {
					const data = { ...job };
					await delay(1000);
					const api = await rh(job);
					const orderId = job.data.orderId;
					// TODO pr to update ts of this method
					const body = await new Promise<any>((resolve, reject) => {
						api.orders(orderId as any, (err, res, body) => {
							if (err)
								reject(); // TODO better handling
							if (body)
								resolve(body);
						});
					});
					if (body.state === 'filled') {
						data.status = 'Running';
					}
					return data;
				}
				default:
					const _exhaustiveSwitch: never = job;
			}
		}
		default:
			const data = { ...job };
			return data;
	}
}