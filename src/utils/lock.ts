export class VizlyNotebookLockManager {
	private promises: Map<string, Promise<void>>;
	private resolvers: Map<string, () => void>;

	constructor() {
		this.promises = new Map();
		this.resolvers = new Map();
	}

	acquireLock(key: string): Promise<void> {
		const prevPromise = this.promises.get(key);
		if (prevPromise) {
			return prevPromise.then(() => {
				return this.acquireLock(key);
			});
		}

		// Define a new promise for the lock, and save the resolver to resolver
		let resolver: () => void | null;
		const promise = new Promise<void>((resolve) => {
			resolver = resolve;
		});

		this.promises.set(key, promise);
		this.resolvers.set(key, resolver!);

		// Resolve this promise immediately as the caller has the lock
		return Promise.resolve();
	}

	// Release a lock for a given key
	releaseLock(key: string): void {
		const promise = this.promises.get(key);
		const resolver = this.resolvers.get(key);
		if (!promise) {
			console.error(`No lock queue found for key: ${key}`);
		}

		// Resolve the promise, and remove the resolver
		if (resolver) {
			resolver();
		}
		this.promises.delete(key);
		this.resolvers.delete(key);
	}
}
