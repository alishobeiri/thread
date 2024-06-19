export async function createIPyWidgetsViewManager() {
	const [{ ManagerBase }, base, controls] = await Promise.all([
		import("@jupyter-widgets/base-manager"),
		import("@jupyter-widgets/base"),
		import("@jupyter-widgets/controls"),
	]);

	class IPyWidgetsViewManager extends ManagerBase {
		private el: HTMLElement;
		private base: any;
		private controls: any;

		constructor(el: HTMLElement) {
			super();
			this.el = el;
			this.base = base;
			this.controls = controls;
		}

		async loadClass(
			className: string,
			moduleName: string,
			moduleVersion: string,
		) {
			return new Promise((resolve, reject) => {
				if (moduleName === "@jupyter-widgets/controls") {
					resolve(this.controls);
				} else if (moduleName === "@jupyter-widgets/base") {
					resolve(this.base);
				} else {
					const fallback = (err: any) => {
						const failedId =
							err.requireModules && err.requireModules[0];
						if (failedId) {
							console.log(
								`Falling back to jsDelivr for ${moduleName}@${moduleVersion}`,
							);
							(window as any).require(
								[
									`https://cdn.jsdelivr.net/npm/${moduleName}@${moduleVersion}/dist/index.js`,
								],
								resolve,
								reject,
							);
						} else {
							throw err;
						}
					};
					(window as any).require(
						[`${moduleName}.js`],
						resolve,
						fallback,
					);
				}
			}).then((module: any) => {
				if (module[className]) {
					return module[className];
				} else {
					return Promise.reject(
						`Class ${className} not found in module ${moduleName}@${moduleVersion}`,
					);
				}
			});
		}

		async display_view(view: any) {
			const { Widget } = await import("@lumino/widgets");
			Widget.attach(view.luminoWidget, this.el);
			return view;
		}

		async _get_comm_info() {
			return Promise.resolve({});
		}

		_create_comm() {
			return Promise.reject("no comms available");
		}
	}

	return IPyWidgetsViewManager;
}
