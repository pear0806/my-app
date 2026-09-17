import { apiClient } from "../../utils/apiClient";

export const getBlocks = () => apiClient.get(`api/blast/blocks`);

export const solveBlockBlast = (payload) =>
	apiClient.post(`api/blast/solve`, payload);
