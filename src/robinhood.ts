import * as rhapi from 'robinhood';

/** return a valid robinhood client, assuming a valid token is provided */
export const robinhood = (token: string, cb: (api: rhapi.RobinhoodWebApi) => void) => {
	const _rh = (token: string, rhInitCb: () => void) => {
		const credentials = { token };
		if (!credentials.token) {
			return rhapi({}, rhInitCb);
		}
		return rhapi(credentials, rhInitCb);
	}
	const r = _rh(token, () => cb(r));
}

/** types for Robinhood api responses */
export namespace Robinhood {
	/**
	 * robinhood sends 200s with the following body
	 * when there is a bad request.
	 */
	export interface Problem {
		details: string;
	}

	/** a place or buy order */
	export namespace Order {
		/** the state of the order */
		export type state = 'queued' | 'unconfirmed' | 'confirmed'
			| 'partially_filled' | 'filled'
			| 'reject' | 'canceled' | 'failed';

		/**
		 * the expected result on a
		 * valid 200
		 */
		export interface Success {
			/** the state of the order */
			state: state;
			[k: string]: any;
		}
		/** defines the expected body of the response */
		export type Body = Problem | Success;
	}
}