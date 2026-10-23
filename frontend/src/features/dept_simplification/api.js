import { apiClient } from "../../utils/apiClient.js";

// 對應後端 main.py：app.include_router(dept_router, prefix="/api/dept")
// 金額一律是「分」的整數。會改動資料的端點都直接回傳最新的 overview。
const BASE = "/api/dept";
const trip = (tripId) => `${BASE}/trips/${tripId}`;

export const fetchTrips = () => apiClient.get(`${BASE}/trips/`);
export const createTrip = (name) => apiClient.post(`${BASE}/trips/`, { name });
export const deleteTrip = (tripId) => apiClient.delete(trip(tripId));

export const fetchOverview = (tripId) => apiClient.get(`${trip(tripId)}/overview/`);
export const createPerson = (tripId, name) => apiClient.post(`${trip(tripId)}/persons/`, { name });
export const deletePerson = (tripId, personId) =>
	apiClient.delete(`${trip(tripId)}/persons/${personId}`);
export const createExpense = (tripId, payload) =>
	apiClient.post(`${trip(tripId)}/expenses/`, payload);
export const deleteExpense = (tripId, expenseId) =>
	apiClient.delete(`${trip(tripId)}/expenses/${expenseId}`);
export const resetTrip = (tripId) => apiClient.delete(`${trip(tripId)}/data/`);
