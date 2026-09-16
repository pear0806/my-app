// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

// 引入兩個子專案的入口元件
import BlockBlastApp from "./features/block_blast_solver/BlockBlastApp.jsx";
import DeptApp from "./features/dept_simplification/DeptApp.jsx";

function Home() {
	const containerStyle = {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		height: "100vh",
		fontFamily: "sans-serif",
	};
	const cardStyle = {
		margin: "10px",
		padding: "20px 40px",
		fontSize: "1.2rem",
		textDecoration: "none",
		color: "white",
		backgroundColor: "#007bff",
		borderRadius: "8px",
		boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
	};

	return (
		<div style={containerStyle}>
			<h1>我的實用工具網站</h1>
			<div style={{ display: "flex", gap: "20px" }}>
				<Link style={cardStyle} to="/blast">
					🧩 方塊解題 (Block Blast Solver)
				</Link>
				<Link style={cardStyle} to="/dept">
					💸 分帳簡化 (Dept Simplification)
				</Link>
			</div>
		</div>
	);
}

export default function App() {
	return (
		<Router>
			<Routes>
				{/* 首頁 */}
				<Route path="/" element={<Home />} />

				{/* 把 /blast 開頭的所有路由交給 BlockBlastApp */}
				<Route path="/blast/*" element={<BlockBlastApp />} />

				{/* 把 /dept 開頭的所有路由交給 DeptApp */}
				<Route path="/dept/*" element={<DeptApp />} />
			</Routes>
		</Router>
	);
}
