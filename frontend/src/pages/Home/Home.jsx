import { Link } from "react-router-dom";

import styles from "./Home.module.css";

const TOOLS = [
	{
		to: "/blast",
		icon: "🧩",
		title: "方塊解題",
		subtitle: "Block Blast Solver",
		description: "設定盤面與方塊，計算最佳放置順序。",
	},
	{
		to: "/dept",
		icon: "💸",
		title: "分帳簡化",
		subtitle: "Dept Simplification",
		description: "記錄花費與代墊，算出最少轉帳次數。",
	},
];

export default function Home() {
	return (
		<main className={styles.page}>
			<h1 className={styles.title}>My-App</h1>
			<p className={styles.subtitle}>選擇一個工具開始</p>
			<ul className={styles.grid}>
				{TOOLS.map((tool) => (
					<li key={tool.to}>
						<Link to={tool.to} className={styles.card}>
							<span className={styles.icon} aria-hidden="true">
								{tool.icon}
							</span>
							<span className={styles.cardTitle}>{tool.title}</span>
							<span className={styles.cardSubtitle}>{tool.subtitle}</span>
							<span className={styles.cardDescription}>{tool.description}</span>
						</Link>
					</li>
				))}
			</ul>
		</main>
	);
}
