import { NextRequest } from "next/server";

const _getModelForNextRequest = (request?: NextRequest) => {
	return "gpt-4o";
};

const _getModelForRequest = (request?: Request) => {
	return "gpt-4o";
};

export const getModelForRequest = (request?: Request | NextRequest) => {
	if (request instanceof NextRequest) {
		return _getModelForNextRequest(request);
	}
	return _getModelForRequest(request);
};
