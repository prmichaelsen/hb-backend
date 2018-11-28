import { firebase } from './firebase';
import {
	IsoString,
	time
	} from '@prmichaelsen/ts-utils';

export const market = {
	meta: {
		async dateMarketCloses() {
			try {
				return time.parse((
					await firebase.database()
					.ref('market/meta/dateMarketCloses')
					.once('value')
				).val());
			} catch (e) {
				throw e;
			}
		},
		async dateMarketOpens() {
			try {
				return time.parse((
					await firebase.database()
					.ref('market/meta/dateMarketOpens')
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
}