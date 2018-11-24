describe('sanitize', () => {

	it('sanitizes appropriately', () => {
		expect({
			prop: {
				undefinedProp: undefined,
				nullProp: null,
				falseyString: '',
				falseyNumber: 0,
				falseyBoolean: false,
				emptyArray: [],
				emptyObject: {},
			}
		}).toEqual({
			prop: {
				nullProp: null,
				falseyString: '',
				falseyNumber: 0,
				falseyBoolean: false,
				emptyArray: [],
				emptyObject: {},
			}
		});
	});

	it('sanitizes recursively', () => {
		expect({
			p1: {
				p2: {
					p3: {
						p4: {
							p5: undefined,
						}
					}
				}
			}
		}).toEqual({
			p1: {
				p2: {
					p3: {
						p4: {}
					}
				}
			}
		});
	});
});