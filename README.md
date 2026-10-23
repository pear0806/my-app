# my-app

多合一工具集：**分帳簡化（dept）** 與 **Block Blast 解題**。
前端 React + Vite（可用 Capacitor 包成手機 App），後端 FastAPI + SQLite。

## 開發

```bash
# 後端（http://localhost:8000，API 文件在 /docs）
cd backend
pip install -r requirements-dev.txt
uvicorn main:app --reload

# 前端（http://localhost:5173）
cd frontend
npm install
npm run dev
```

| 指令（frontend） | 用途 |
| --- | --- |
| `npm run lint` | ESLint。**JSX 禁止 inline `style`**，樣式一律寫在 `*.module.css` |
| `npm test` | Vitest 單元測試 |
| `npm run format` | Prettier 格式化（CI 會跑 `format:check`） |
| `npm run build` | 正式環境打包 |

後端測試：`cd backend && python -m pytest`

## 設定

| 變數 | 放哪裡 | 預設 | 說明 |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | `frontend/.env.production` / `.env.local` | `http://localhost:8000` | 前端要連的後端網址 |
| `CORS_ORIGINS` | 後端環境變數 | localhost:5173、Capacitor | 允許的前端來源，逗號分隔 |
| `DEPT_DATABASE_URL` | 後端環境變數 | `backend/dept_simplification.db` | 資料庫位置 |

## 專案結構與慣例

```
frontend/src
├── components/      跨功能共用元件（BackButton、Toast）
├── hooks/           跨功能共用 hook
├── utils/           apiClient、haptics、saveImage…
├── styles/          tokens.css（設計代幣）、reset.css
├── pages/Home/
└── features/<name>/ 每個功能自成一包：頁面、hook、api、純函式、*.module.css
```

- 樣式使用 **CSS Modules**；狀態變化用 `data-*` / `aria-*` 屬性，不用 inline style。
- 金額在前後端一律以**整數「分」**傳遞與儲存，只有顯示時才轉成元。
- 後端啟動時會自動升級舊資料庫（並先備份成 `*.db.bak-時間`）。
