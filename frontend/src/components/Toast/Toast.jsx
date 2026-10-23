import styles from "./Toast.module.css";

export default function Toast({ toast, onClose }) {
	if (!toast) return null;
	return (
		<div className={styles.toast} role="status" aria-live="polite">
			<span className={styles.dot} data-type={toast.type} />
			<p className={styles.message}>{toast.message}</p>
			<button type="button" className={styles.close} onClick={onClose}>
				關閉
			</button>
		</div>
	);
}
