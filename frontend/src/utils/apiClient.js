import axios from "axios";

// 開發時預設連本機後端；正式環境請在 .env.production 設定 VITE_API_BASE_URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
	baseURL: BASE_URL,
	timeout: 10000,
});

/** FastAPI 的 detail 可能是字串，也可能是 422 的驗證錯誤陣列。 */
export function extractMessage(error) {
	const detail = error.response?.data?.detail;
	if (Array.isArray(detail)) return detail.map((item) => item.msg).join("、");
	if (typeof detail === "string") return detail;
	return error.message || "請求失敗";
}

apiClient.interceptors.response.use(
	(response) => response.data,
	(error) => {
		console.error("API發生錯誤:", error.response?.status, error.message);
		error.message = extractMessage(error);
		return Promise.reject(error);
	},
);
