import ConnectionManager from "../../../services/connection/connectionManager";
import { ActionState } from "../magicQuery";
import { sharedAction } from "./shared/utils";

export async function* fixErrorAction(
	actionState: ActionState,
	wasAborted: () => boolean,
): AsyncGenerator<any, void, unknown> {
	yield* sharedAction(
		actionState,
		wasAborted,
		`${
			ConnectionManager.getInstance().serverUrl
		}/thread/api/magic/actions/fixError`,
		"code",
	);
}
