import { apiClient } from "../../utils/apiClient.js";

// 對應後端 main.py：app.include_router(dept_router, prefix="/api/dept")
const BASE = "/api/dept";

export const fetchOverview = () => apiClient.get(`${BASE}/overview/`);
export const createPerson = (name) => apiClient.post(`${BASE}/persons/`, { name });
export const deletePerson = (id) => apiClient.delete(`${BASE}/persons/${id}`);
export const createExpense = (payload) => apiClient.post(`${BASE}/expenses/`, payload);
export const deleteExpense = (id) => apiClient.delete(`${BASE}/expenses/${id}`);
export const resetAll = () => apiClient.delete(`${BASE}/reset/`);
