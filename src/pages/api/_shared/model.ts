import { NextRequest } from "next/server";

const _getModelForNextRequest = (request?: NextRequest) => {
	if (request == undefined) return "gpt-4o";
	const plan = request.cookies.get("noterous-plan");
	if (plan?.value == "premium" || plan?.value == "basic") {
		return "gpt-4o";
	}
	return "gpt-4o";
};

const _getModelForRequest = (request?: Request) => {
	if (request == undefined) return "gpt-4o";
	const cookieStr = request.headers.get("cookie");
	if (cookieStr) {
		const cookies = cookieStr
			.split("; ")
			.reduce((prev: { [key: string]: string }, current) => {
				const [name, value] = current.split("=");
				prev[name] = value;
				return prev;
			}, {});

		const plan = cookies["noterous-plan"];
		if (plan == "premium" || plan == "basic") {
			return "gpt-4o";
		}
	}

	return "gpt-4o";
};

export const getModelForRequest = (request?: Request | NextRequest) => {
	if (request instanceof NextRequest) {
		return _getModelForNextRequest(request);
	}
	return _getModelForRequest(request);
};
