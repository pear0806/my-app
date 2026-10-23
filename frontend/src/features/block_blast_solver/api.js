import { apiClient } from "../../utils/apiClient";

// 求解與辨識比一般請求慢，放寬逾時時間
const SLOW_REQUEST_TIMEOUT_MS = 30000;

export const getBlocks = () => apiClient.get("/api/blast/blocks");

export const solveBlockBlast = (payload) =>
	apiClient.post("/api/blast/solve", payload, { timeout: SLOW_REQUEST_TIMEOUT_MS });

export const recognizeScreenshot = (file) => {
	const formData = new FormData();
	formData.append("file", file);
	return apiClient.post("/api/blast/recognize", formData, {
		timeout: SLOW_REQUEST_TIMEOUT_MS,
	});
};
