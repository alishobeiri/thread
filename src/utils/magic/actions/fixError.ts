import { handleFixError } from "shared-thread-utils";
import { useSettingsStore } from "../../../components/settings/SettingsStore";
import { ActionState } from "../magicQuery";
import { sharedAction, sharedLocalAction } from "./shared/utils";

const { getServerProxyUrl } = useSettingsStore.getState();

export async function* fixErrorAction(
	actionState: ActionState,
	wasAborted: () => boolean,
): AsyncGenerator<any, void, unknown> {
	const isLocal = useSettingsStore.getState().isLocal;
	if (isLocal) {
		const metadata = useSettingsStore
			.getState()
			.getAdditionalRequestMetadata();
		yield* sharedLocalAction({
			streamGenerator: handleFixError,
			params: {
				actionState,
				modelInformation: metadata.modelInformation,
				uniqueId: metadata.uniqueId,
			},
			shouldCancel: wasAborted,
			cellType: "code",
		});
	} else {
		yield* sharedAction(
			actionState,
			wasAborted,
			`${getServerProxyUrl()}/api/magic/actions/fixError`,
			"code",
		);
	}
}
