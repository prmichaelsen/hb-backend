import {
	isNullOrUndefined,
	isString
	} from 'util';

export type IMap<T> = {[key: string]: T};

export const isSet = (o: any) => {
	if (isNullOrUndefined(o))
		return false;
	if (Array.isArray(o))
		return o.length > 0;
	if (isString(o))
		return o.trim() !== ''
	return true;
}

export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

export function delay(durationMs: number) {
	return new Promise(r => setTimeout(r, durationMs));
}