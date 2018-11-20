import * as rhapi from 'robinhood';

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