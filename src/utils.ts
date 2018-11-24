import {
	isNullOrUndefined,
	isString,
	isBoolean,
	isNumber,
	isFunction,
	isObject,
	isUndefined,
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

type NonObject = undefined | null | boolean | string | number | Function
function isNonObject(o: any): o is NonObject {
	return isNullOrUndefined(o)
	|| isString(o)
	|| isBoolean(o)
	|| isNumber(o)
	|| isFunction(o)
	;
}


export type Immutable<T> =
	T extends NonObject ? T :
	T extends Array<infer U> ? ReadonlyArray<U> :
	T extends Map<infer K, infer V> ? ReadonlyMap<K, V> : Readonly<T>

export type DeepImmutable<T> =
	T extends NonObject ? T :
	T extends Array<infer U> ? DeepImmutableArray<U> :
	T extends Map<infer K, infer V> ? DeepImmutableMap<K, V> : DeepImmutableObject<T>

interface DeepImmutableArray<T> extends ReadonlyArray<DeepImmutable<T>> { }
interface DeepImmutableMap<K, V> extends ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>> { }
export type DeepImmutableObject<T> = {
	readonly [K in keyof T]: DeepImmutable<T[K]>
}

// allow falsy or empty values, but never undefined
export function sanitize(o: IMap<IMap<any> | NonObject>) {
	const result: IMap<any> = {};
	Object.keys(o).forEach(key => {
		const value = o[key];
		if (isUndefined(value)) {
			return;
		}
		if (!isNonObject(value)) {
			result[key] = sanitize(value);
		} else {
			result[key] = value;
		}
	});
	return result;
}