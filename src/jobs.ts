import { Job } from '@prmichaelsen/hb-common';
import fetch from 'node-fetch';
import {
	DeepImmutableObject,
	delay,
	get,
	} from '@prmichaelsen/ts-utils';
import {
	rh,
	} from './helpers';
import {
	Options,
	} from 'robinhood';
import {
	isNullOrUndefined,
	} from 'util';
import _ = require('lodash');

export const run = async (job: DeepImmutableObject<Job.Job>): Promise<Job.Job> => {
	switch (job.type) {
		case Job.Type.OpenClose: {
			const data = _.cloneDeep<Job.Job>(job);
			let iexData;
			try {
				const res = await fetch(
					'https://api.iextrading.com/1.0/stock/' +
					job.payload.symbol +
					'/ohlc'
				);
				iexData = await res.json();
			} catch (e) {
				console.error(e);
				return { ...data, status: 'Failed', message: e.toString() };
			}
			if (!iexData) {
				return { ...data, status: 'Failed' };
			}
			data.body = iexData;
			data.status = 'Success';
			return data;
		}
		case Job.Type.Daytrade: {
			const data = _.cloneDeep<Job.Job>(job);
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
			switch (job.lifecycle.step) {
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
						data.lifecycle = {
							...data.lifecycle,
							step: 'sell',
							orderId,
						}
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
					const _exhaustiveSwitch: never = job.lifecycle;
			}
		}
		case Job.Type.Quote: {
			const data = _.cloneDeep<Job.Job>(job);
			const api = await rh(job);
			return await new Promise<Job.Job>((resolve, reject) => {
				api.quote_data(job.payload.symbol, (err, resp, body) => {
					if (err) {
						resolve({
							...data,
							message: err.toString(),
							status: 'Failed',
						});
					}
					if (body) {
						resolve({
							...data,
							body,
							progress: 1,
							status: 'Success',
						});
					}
					resolve({
						...data,
						progress: 1,
						status: 'Failed',
					});
				});
			});
		}
		case Job.Type.Fundamentals: {
			const data = _.cloneDeep<Job.Job>(job);
			const api = await rh(job);
			return await new Promise<Job.Job>((resolve, reject) => {
				api.fundamentals(job.payload.symbol, (err, resp, body) => {
					if (err) {
						resolve({
							...data,
							message: err.toString(),
							status: 'Failed',
						});
					}
					if (body) {
						resolve({
							...data,
							body,
							progress: 1,
							status: 'Success',
						});
					}
					resolve({
						...data,
						progress: 1,
						status: 'Failed',
					});
				});
			});
		}
		case Job.Type.Instrument: {
			const data = { ...job };
			const api = await rh(job);
			return await new Promise<Job.Job>((resolve, reject) => {
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
		case Job.Type.DaytradeBuy: {
			const data = { ...job };
			const api = await rh(job);
			const {
				spendAmount, symbol,
				instrumentUrl, limit
			} = job.payload;
			const quantity = Math.floor(spendAmount / limit);
			return await new Promise<Job.Job>((resolve, reject) => {
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

export const validate = async (job: DeepImmutableObject<Job.Job>): Promise<Job.Job> => {
	const data = { ...job };
	switch (job.type) {
		case Job.Type.Daytrade: {
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
		case Job.Type.Quote: {
			if (isNullOrUndefined(job.payload.symbol)) {
				return ({
					...data,
					status: 'Problem',
					message: 'Symbol must be present.'
				});
			}
			return ({ ...data, status: 'Ready' });
		}
		case Job.Type.Instrument: {
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

export const pend = async (job: DeepImmutableObject<Job.Job>): Promise<Job.Job> => {
	switch (job.type) {
		case Job.Type.Daytrade: {
			switch(job.lifecycle.step) {
				case 'init': {
					return job;
				}
				case 'sell': {
					const data = { ...job };
					await delay(1000);
					const api = await rh(job);
					const orderId = job.lifecycle.orderId;
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
					const _exhaustiveSwitch: never = job.lifecycle;
			}
		}
		default:
			const data = { ...job };
			return data;
	}
}