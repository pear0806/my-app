import {
    lazy,
    Suspense,
} from 'react';

import {
    BrowserRouter as Router,
    Link,
    Route,
    Routes,
} from 'react-router-dom';

const BlockBlastApp = lazy(
	() => import("./features/block_blast_solver/BlockBlastApp.jsx"),
);
const DeptApp = lazy(
	() => import("./features/dept_simplification/DeptApp.jsx"),
);

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
			<h1>My-App</h1>
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

const LoadingFallBack = () => {
	<div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
		<h2>模組載入中...</h2>
	</div>;
};

export default function App() {
	return (
		<Router>
			<Suspense fallback={<LoadingFallBack />}>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/blast/*" element={<BlockBlastApp />} />
					<Route path="/dept/*" element={<DeptApp />} />
				</Routes>
			</Suspense>
		</Router>
	);
}
