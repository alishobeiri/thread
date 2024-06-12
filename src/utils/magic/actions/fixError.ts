import { useServerSettingsModalStore } from "../../../components/modals/server-settings/ServerSettingsModalStore";
import { ActionState } from "../magicQuery";
import { sharedAction } from "./shared/utils";

const { getServerProxyUrl } = useServerSettingsModalStore.getState();

export async function* fixErrorAction(
	actionState: ActionState,
	wasAborted: () => boolean,
): AsyncGenerator<any, void, unknown> {
	yield* sharedAction(
		actionState,
		wasAborted,
		`${getServerProxyUrl()}/api/magic/actions/fixError`,
		"code",
	);
}
