type Getter<In, Out> = (o: NonNullable<In>) => Out | undefined;
export function get<In, Out>(
	In: In,
	fOut: ((o: In) => Out | undefined)
): Out | undefined;
export function get<In, A, Out>(
	In: In,
	fA: ((o: In) => A | undefined),
	fOut: Getter<A, Out>
): Out | undefined;
export function get<In, A, B, Out>(
	In: In,
	fA: ((o: In) => A | undefined),
	fB: Getter<A, B>,
	fOut: Getter<B, Out>
): Out | undefined;
export function get<In, A, B, C, Out>(
	In: In,
	fA: ((o: In) => A | undefined),
	fB: Getter<A, B>,
	fC: Getter<B, C>,
	fOut: ((o: NonNullable<C>) => Out | undefined)
): Out | undefined;
export function get<In, A, B, C, D, Out>(
	In: In,
	fA: ((o: In) => A | undefined),
	fB: Getter<A, B>,
	fC: Getter<B, C>,
	fD: Getter<C, D>,
	fOut: ((o: NonNullable<D>) => Out | undefined)
): Out | undefined;
export function get<In, A, B, C, D, E, Out>(
	In: In,
	fA: ((o: In) => A | undefined),
	fB: Getter<A, B>,
	fC: Getter<B, C>,
	fD: Getter<C, D>,
	fE: Getter<D, E>,
	fOut: ((o: NonNullable<E>) => Out | undefined)
): Out | undefined;
export function get<In, A, B, C, D, E, F, Out>(
	In: In,
	fA: ((o: In) => A | undefined),
	fB: Getter<A, B>,
	fC: Getter<B, C>,
	fD: Getter<C, D>,
	fE: Getter<D, E>,
	fF: Getter<E, F>,
	fOut: ((o: NonNullable<F>) => Out | undefined)
): Out | undefined;
export function get<In, A, B, C, D, E, F, G, Out>(
	In: In,
	fA: ((o: In) => A | undefined),
	fB: Getter<A, B>,
	fC: Getter<B, C>,
	fD: Getter<C, D>,
	fE: Getter<D, E>,
	fF: Getter<E, F>,
	fG: Getter<F, G>,
	fOut: ((o: NonNullable<G>) => Out | undefined)
): Out | undefined;
export function get<In, A, B, C, D, E, F, G, H, Out>(
	In: In,
	fA: ((o: In) => A | undefined),
	fB: Getter<A, B>,
	fC: Getter<B, C>,
	fD: Getter<C, D>,
	fE: Getter<D, E>,
	fF: Getter<E, F>,
	fG: Getter<F, G>,
	fH: Getter<G, H>,
	fOut: ((o: NonNullable<H>) => Out | undefined)
): Out | undefined;

/**
 * get in a TypeSafe manner up to 9 property levels deep.
 * If you need more levels, add to this function or re-write your code
 * so that you don't.
 * @param In the object to deconstruct
 * @param functions The functions that will extract properties in a chain
 * @returns your property or undefined
 */
export function get(
	o: any,
	...functions: Array<(o: NonNullable<any>) => any | undefined>
): any | undefined {
	functions.some(f => {
		if (f === undefined || o === undefined || o === null) {
			return true;
		}
		o = f(o);
		return false;
	});
	return o;
}
export default get;