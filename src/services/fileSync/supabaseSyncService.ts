import { captureException } from "@sentry/nextjs";
import {
	Session,
	createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";
import {
	UserSettings,
	UserSettingsPayload,
} from "../../components/modals/settings/SettingsModalStore";
import { useNotebookStore } from "../../components/notebook/store/NotebookStore";
import { Database } from "../../types/database.types";
import { NotebookFile, NotebookFileObject } from "../../types/file.types";
import { NEW_NOTEBOOK, SB_FILES_BUCKET } from "../../utils/constants/constants";
import { parseNotebookBlob } from "../../utils/conversions";
import { trackEventData } from "../../utils/posthog";
import { getFileId } from "../../utils/utils";
import ConnectionManager, {
	useConnectionManagerStore,
} from "../connection/connectionManager";

// Add a debounce because otherwise we gonna DDOS Supabase with all the saves
const UPLOAD_DEBOUNCE_TIME = 2000;

const supabase = createClientComponentClient<Database>();
const sbStorage = supabase.storage.from(SB_FILES_BUCKET);
class SupabaseFileSyncService {
	static instance: SupabaseFileSyncService | null = null;
	static session: Session | undefined;
	static inprogressUploads: Record<string, NodeJS.Timeout> = {};
	static lockedFiles = new Set<string>();

	private constructor() {}

	static getInstance(): SupabaseFileSyncService {
		if (!SupabaseFileSyncService.instance) {
			SupabaseFileSyncService.instance = new SupabaseFileSyncService();
		}
		return SupabaseFileSyncService.instance;
	}

	static getSession() {
		return ConnectionManager.getInstance()
			.getSupabaseInfo()
			.then((session) => {
				SupabaseFileSyncService.session = session;
			});
	}

	static async validateAuth() {
		if (!SupabaseFileSyncService.session) {
			throw new Error("Not logged in");
		}
		return SupabaseFileSyncService.session;
	}

	async delete(path: string) {
		const session = await SupabaseFileSyncService.validateAuth();
		const userId = session!.user.id;
		return sbStorage.remove([`${userId}/${path}`]);
	}

	async save(path: string, contents: NotebookFile) {
		const session = await SupabaseFileSyncService.validateAuth();
		const userId = session!.user.id;
		this.debouncedUpload(userId, path, contents);
	}

	async upload(uploadKey: string, contents: NotebookFile) {
		if (SupabaseFileSyncService.lockedFiles.has(uploadKey)) {
			console.warn(
				`Rejected save for ${uploadKey} which was queued for deletion`,
			);
			// Do not process a file that is about to be removed
			return Promise.resolve(contents);
		}
		useNotebookStore.setState({ isSaving: true });
		return sbStorage
			.upload(uploadKey, JSON.stringify(contents), {
				upsert: true,
			})
			.then(() => {
				console.debug("Upload complete for: ", uploadKey);
				return contents;
			})
			.catch((error) => {
				captureException(error);
				console.error("Upload error: ", error);
				return contents;
			})
			.finally(() => {
				useNotebookStore.setState({ isSaving: false });
			});
	}

	createNewNotebook() {
		const user = useConnectionManagerStore.getState().user;
		const userId = user?.id;
		if (!userId) return;

		let newNotebook = NEW_NOTEBOOK();
		const filePath = `${userId}/${getFileId(newNotebook)}`;
		// Upload the notebook
		// we save the storage ID when we actually upload the file
		sbStorage
			.upload(filePath, JSON.stringify(newNotebook))
			.then((result) => {
				const { data, error } = result;
				if (data) {
					const metadata = useNotebookStore.getState().metadata;
					useNotebookStore.setState({
						metadata: {
							...metadata,
							noterous: {
								...metadata.noterous,
								storageId: (data as any).id,
							},
						},
					});
				}
			});

		return newNotebook;
	}

	_lockFileAndClearUploads(path: string) {
		SupabaseFileSyncService.lockedFiles.add(path);
		if (SupabaseFileSyncService.inprogressUploads[path]) {
			clearTimeout(SupabaseFileSyncService.inprogressUploads[path]);
			delete SupabaseFileSyncService.inprogressUploads[path];
		}
	}

	_releaseLockForFile(path: string) {
		SupabaseFileSyncService.lockedFiles.delete(path);
	}

	async rename(newName: string, storageId: string) {
		return supabase
			.from("storage")
			.update({
				display_name: newName,
			})
			.eq("id", storageId)
			.then((result) => {
				console.debug("Rename update result: ", result);
			});
	}

	debouncedUpload(userId: string, path: string, contents: NotebookFile) {
		// Unique key for each user-path combination
		const uploadKey = `${userId}/${path}`;
		if (SupabaseFileSyncService.lockedFiles.has(uploadKey)) {
			// Do not process a file that is about to be removed
			console.warn(
				`Rejected save for ${uploadKey} which was queued for deletion`,
			);
			return;
		}

		// Clear existing timer if there is one
		if (SupabaseFileSyncService.inprogressUploads[uploadKey]) {
			clearTimeout(SupabaseFileSyncService.inprogressUploads[uploadKey]);
		}

		// Set a new timer
		SupabaseFileSyncService.inprogressUploads[uploadKey] = setTimeout(
			() => {
				// Clear the timer from the dictionary after upload
				this.upload(uploadKey, contents);
				delete SupabaseFileSyncService.inprogressUploads[uploadKey];
			},
			UPLOAD_DEBOUNCE_TIME,
		);
	}

	downloadNotebook(path: string) {
		return sbStorage.download(`${path}?${Date.now()}`).then((file) => {
			const { data, error } = file;
			return parseNotebookBlob(data!);
		});
	}

	listNotebooks(): Promise<NotebookFileObject[]> {
		return SupabaseFileSyncService.getSession()
			.then(() => {
				return sbStorage.list(
					`${SupabaseFileSyncService.session!.user.id}`,
					{ sortBy: { column: "updated_at", order: "desc" } },
				);
			})
			.then((files) => {
				const { data, error } = files;
				if (data) {
					const notebooksToSet = data.filter(
						(file) => !file.name.startsWith("."),
					);
					return supabase
						.from("storage")
						.select("id, name, display_name, published")
						.then((result) => {
							const { data: storageData, error: storageError } =
								result;
							if (storageData) {
								return notebooksToSet.map((notebook) => {
									const storageItem = storageData.find(
										(item) => item.id === notebook.id,
									);
									return {
										...notebook,
										display_name:
											storageItem?.display_name ||
											notebook.name,
										published:
											storageItem?.published || false,
									};
								});
							}

							if (storageError) {
								console.error(storageError);
							}
							return [];
						});
				} else {
					console.error(error);
				}
				return [];
			});
	}

	publishNotebook(path: string) {
		trackEventData("[NOTEBOOK] Published notebook", {
			path: path,
		});
		return this._handlePublishUnpublishNotebook(path, true);
	}

	unpublishNotebook(path: string) {
		trackEventData("[NOTEBOOK] Unpublished notebook", {
			path: path,
		});
		return this._handlePublishUnpublishNotebook(path, false);
	}

	_handlePublishUnpublishNotebook(path: string, published = false) {
		return SupabaseFileSyncService.getSession()
			.then(() => {
				return this.listNotebooks();
			})
			.then(async (notebooks) => {
				const notebooksToPublish = notebooks
					.filter((notebook) => notebook.name == path)
					.map((notebook) => {
						return {
							id: notebook.id,
							name: notebook.name,
							user_id:
								notebook.owner ??
								SupabaseFileSyncService.session!.user.id,
							published: published,
						};
					});
				const firstNotebook = notebooksToPublish[0];
				if (firstNotebook) {
					await supabase.from("storage").upsert([firstNotebook]);
					return [firstNotebook];
				}
				return [];
			});
	}

	handleSaveUserSettings(settings: UserSettings) {
		// Ensure the session is initialized
		return SupabaseFileSyncService.getSession().then(() => {
			const { context, responseStyle, primaryColor, secondaryColor } =
				settings;
			const userId = SupabaseFileSyncService.session!.user.id;

			// Prepare the settings object for upsert
			const settingsToUpdate = {
				user_id: userId,
				context: context,
				responseStyle: responseStyle,
				primaryColor: primaryColor,
				secondaryColor: secondaryColor,
			};

			// Upsert the settings in the 'settings' table
			return supabase
				.from("settings")
				.upsert(settingsToUpdate, {
					onConflict: "user_id",
				})
				.then((response) => {
					if (response.error) {
						throw response.error;
					}
					return response.data;
				});
		});
	}

	async fetchUserSettings(userId: string) {
		const { data, error } = await supabase
			.from("settings")
			.select("*")
			.eq("user_id", userId)
			.maybeSingle();

		if (error) {
			console.error("Error fetching settings:", error);
			return null;
		}

		return data as UserSettingsPayload;
	}

	isItemPublished(name: string) {
		return supabase
			.from("storage")
			.select("*")
			.eq("name", name)
			.limit(1)
			.maybeSingle()
			.then((value) => (value.data ? value.data.published : false));
	}
}

export default SupabaseFileSyncService;
