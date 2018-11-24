import { config } from './config';
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