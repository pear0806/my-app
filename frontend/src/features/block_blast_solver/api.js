import { apiClient } from '../../utils/apiClient';

export const getBlocks = () => apiClient.get(`api/blast/blocks`);

export const solveBlockBlast = (payload) =>
	apiClient.post(`api/blast/solve`, payload);

export const recognizeScreenshot = (file) => {
	const formData = new FormData();
	formData.append("file", file);
	return apiClient.post(`/api/blast/recognize`, formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
};
