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

type Primitive = undefined | null | boolean | string | number | Function

export type Immutable<T> =
	T extends Primitive ? T :
	T extends Array<infer U> ? ReadonlyArray<U> :
	T extends Map<infer K, infer V> ? ReadonlyMap<K, V> : Readonly<T>

export type DeepImmutable<T> =
	T extends Primitive ? T :
	T extends Array<infer U> ? DeepImmutableArray<U> :
	T extends Map<infer K, infer V> ? DeepImmutableMap<K, V> : DeepImmutableObject<T>

interface DeepImmutableArray<T> extends ReadonlyArray<DeepImmutable<T>> { }
interface DeepImmutableMap<K, V> extends ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>> { }
export type DeepImmutableObject<T> = {
	readonly [K in keyof T]: DeepImmutable<T[K]>
}