import axios from "axios";

const isProd = import.meta.env.PROD;
const BAST_URL = isProd
	? "https://your-production-domain.com"
	: "http://localhost:8000";

export const apiClient = axios.create({
	baseURL: BAST_URL,
	timeout: 10000,
});

apiClient.interceptors.response.use(
	(response) => response.data,
	(error) => {
		console.error("API發生錯誤:", error.response?.status, error.message);
		return Promise.reject(error);
	},
);
