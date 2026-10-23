import { lazy, Suspense } from "react";

import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import Home from "./pages/Home/Home.jsx";

const BlockBlastApp = lazy(() => import("./features/block_blast_solver/BlockBlastApp.jsx"));
const DeptApp = lazy(() => import("./features/dept_simplification/DeptApp.jsx"));

function LoadingFallback() {
	return <p role="status">模組載入中...</p>;
}

export default function App() {
	return (
		<Router>
			<Suspense fallback={<LoadingFallback />}>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/blast/*" element={<BlockBlastApp />} />
					<Route path="/dept/*" element={<DeptApp />} />
				</Routes>
			</Suspense>
		</Router>
	);
}
