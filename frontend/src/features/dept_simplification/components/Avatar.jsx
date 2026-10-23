import { initials } from "../money";
import styles from "./Avatar.module.css";

export default function Avatar({ name }) {
	return (
		<span className={styles.avatar} aria-hidden="true">
			{initials(name)}
		</span>
	);
}
