import { useCallback, useEffect, useState } from "react";

const DEFAULT_DURATION_MS = 3200;

/** 簡單的 Toast 狀態：notify 之後一段時間自動消失。 */
export function useToast(duration = DEFAULT_DURATION_MS) {
	const [toast, setToast] = useState(null);

	const notify = useCallback((message, type = "ok") => setToast({ message, type }), []);
	const dismiss = useCallback(() => setToast(null), []);

	useEffect(() => {
		if (!toast) return undefined;
		const id = window.setTimeout(() => setToast(null), duration);
		return () => window.clearTimeout(id);
	}, [toast, duration]);

	return { toast, notify, dismiss };
}
