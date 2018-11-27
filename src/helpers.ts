import { firebase } from './firebase';
import { robinhood } from './robinhood';
import { Job } from '@prmichaelsen/hb-common';
import { RobinhoodWebApi } from 'robinhood';
import { isNullOrUndefined } from 'util';

/**
 * retrieve the user's robinhood token for this job and
 * authenticate a robinhood api client
*/
export const rh = (job: Job.Job): Promise<RobinhoodWebApi> => new Promise((resolve, reject) => {
	firebase.database().ref(['robinhood-tokens', job.userId].join('/'))
		.once('value', snapshot => {
			const token = snapshot.val().token.access_token;
			if (isNullOrUndefined(token)) {
				return reject('token was undefined.');
			}
			robinhood(token, api => {
				resolve(api);
			});
		});
});