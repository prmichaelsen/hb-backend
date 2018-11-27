export namespace RobinhoodResponses {
	export interface Problem {
		details: string;
	}

	export namespace OrderResponse {
		export type state = 'queued' | 'unconfirmed' | 'confirmed'
			| 'partially_filled' | 'filled'
			| 'reject' | 'canceled' | 'failed';
	}
}