import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import styles from "./BackButton.module.css";

export default function BackButton({ to = "/", children = "返回首頁" }) {
	return (
		<Link to={to} className={styles.backButton}>
			<ArrowLeft size={18} aria-hidden="true" />
			{children}
		</Link>
	);
}
