import { API_URL } from "../../constants/constants";
import { ActionState } from "../magicQuery";
import { sharedAction } from "./shared/utils";

export async function* fixErrorAction(
	actionState: ActionState,
	wasAborted: () => boolean,
): AsyncGenerator<any, void, unknown> {
	yield* sharedAction(
		actionState,
		wasAborted,
		`${API_URL}/api/magic/actions/fixError`,
		"code",
	);
}
