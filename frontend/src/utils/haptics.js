import {
    Haptics,
    ImpactStyle,
    NotificationType,
} from '@capacitor/haptics';

// 封裝安全呼叫，避免在不支援的環境報錯
export const triggerHaptic = {
	// 輕微震動 (適合：點擊一般按鈕、開啟側滑選單)
	light: async () => {
		try {
			await Haptics.impact({ style: ImpactStyle.Light });
		} catch (e) {}
	},
	// 中等震動 (適合：新增一筆帳務、儲存自訂方塊)
	medium: async () => {
		try {
			await Haptics.impact({ style: ImpactStyle.Medium });
		} catch (e) {}
	},
	// 重度震動 (適合：刪除項目、清空盤面)
	heavy: async () => {
		try {
			await Haptics.impact({ style: ImpactStyle.Heavy });
		} catch (e) {}
	},
	// 成功回饋 (適合：結算完成、截圖辨識成功)
	success: async () => {
		try {
			await Haptics.notification({ type: NotificationType.Success });
		} catch (e) {}
	},
	// 警告回饋 (適合：表單忘記填、操作錯誤)
	warning: async () => {
		try {
			await Haptics.notification({ type: NotificationType.Warning });
		} catch (e) {}
	},
};
