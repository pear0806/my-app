import { apiClient } from "../../utils/apiClient.js";

export const fetchOverview = () => apiClient.get(`/overview/`);
export const createPerson = (name) => apiClient.post(`/persons/`, { name });
export const deletePerson = (id) => apiClient.delete(`/persons/${id}`);
export const createExpense = (payload) => apiClient.post(`/expenses/`, payload);
export const deleteExpense = (id) => apiClient.delete(`/expenses/${id}`);
export const resetAll = () => apiClient.delete(`/reset`);
