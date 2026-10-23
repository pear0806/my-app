import { Capacitor } from "@capacitor/core";

/**
 * 把 canvas 存成圖片。回傳 "shared" | "downloaded" | "cancelled"。
 *  - Capacitor App：寫入快取後呼叫系統分享選單（WebView 裡的 <a download> 不會動）
 *  - 手機瀏覽器：優先用 Web Share API 分享檔案
 *  - 其他（桌機）：直接下載
 */
export async function saveImage(canvas, filename) {
	if (Capacitor.isNativePlatform()) {
		// 外掛只在原生環境才需要，動態載入不拖慢網頁版
		const [{ Filesystem, Directory }, { Share }] = await Promise.all([
			import("@capacitor/filesystem"),
			import("@capacitor/share"),
		]);
		const data = canvas.toDataURL("image/png").split(",")[1];
		const { uri } = await Filesystem.writeFile({
			path: filename,
			data,
			directory: Directory.Cache,
		});
		try {
			await Share.share({ title: filename, url: uri, dialogTitle: "分享結算圖卡" });
			return "shared";
		} catch {
			return "cancelled"; // 使用者關閉分享選單
		}
	}

	const blob = await new Promise((resolve, reject) =>
		canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("無法產生圖片"))), "image/png"),
	);
	const file = new File([blob], filename, { type: "image/png" });

	const isTouchDevice = window.matchMedia?.("(pointer: coarse)").matches;
	if (isTouchDevice && navigator.canShare?.({ files: [file] })) {
		try {
			await navigator.share({ files: [file], title: filename });
			return "shared";
		} catch (err) {
			if (err.name === "AbortError") return "cancelled";
			// 其他錯誤就退回下載
		}
	}

	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.download = filename;
	link.href = url;
	link.click();
	URL.revokeObjectURL(url);
	return "downloaded";
}
