import React, { useState, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { Activity } from "lucide-react";

const ActivityLog = () => {
	const { isManager } = useAuth();
	const [logs, setLogs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState("my");

	useEffect(() => {
		loadLogs();
	}, [filter]);

	const loadLogs = async () => {
		try {
			const endpoint = filter === "my" ? "/activity/my" : "/activity";
			const response = await api.get(endpoint, {
				params: { limit: 100 },
			});
			setLogs(response.data.logs);
		} catch (error) {
			console.error("Error loading activity logs:", error);
		} finally {
			setLoading(false);
		}
	};

	const getActionText = (log) => {
		let action = log.action;
		if (action === "update" && log.details?.body?.status && Object.keys(log.details.body).length === 1) {
			action = log.details.body.status === "open" ? "open" : log.details.body.status === "closed" ? "close" : "close";
		}

		const actions = {
			create: "יצר",
			update: "עדכן",
			delete: "מחק",
			login: "התחבר",
			open: "פתח",
			close: "סגר",
		};
		return actions[action] || action;
	};

	const getTableText = (table) => {
		const tables = {
			customers: "לקוח",
			tasks: "משימה",
			users: "משתמש",
			categories: "קטגוריה",
		};
		return tables[table] || table;
	};

	const getEntityName = (log) => {
		// Try to get entity name from details
		if (log.details) {
			try {
				const details = typeof log.details === "string" ? JSON.parse(log.details) : log.details;

				// Details can be nested in body
				const data = details.body || details;

				// For tasks, look for title
				if (log.table_name === "tasks" && data.title) {
					return data.title;
				}

				// For customers, look for name
				if (log.table_name === "customers" && data.name) {
					return data.name;
				}

				// For categories, look for name
				if (log.table_name === "categories" && data.name) {
					return data.name;
				}

				// For users, look for full_name or username
				if (log.table_name === "users") {
					return data.full_name || data.username || details.username;
				}
			} catch (e) {
				// If parsing fails, continue
			}
		}

		return null;
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">לוג פעילות</h1>
				<p className="text-gray-600 dark:text-gray-400">מעקב אחר פעולות במערכת</p>
			</div>

			{/* Filter */}
			{isManager && (
				<div className="flex gap-2">
					<button onClick={() => setFilter("my")} className={`px-4 py-2 rounded-md ${filter === "my" ? "bg-primary-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}>
						הפעילות שלי
					</button>
					<button
						onClick={() => setFilter("all")}
						className={`px-4 py-2 rounded-md ${filter === "all" ? "bg-primary-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
					>
						כל הפעילות
					</button>
				</div>
			)}

			{/* Activity List */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
				{loading ? (
					<div className="p-8 text-center text-gray-500 dark:text-gray-400">טוען...</div>
				) : logs.length === 0 ? (
					<div className="p-8 text-center text-gray-500 dark:text-gray-400">אין פעילות להציג</div>
				) : (
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{logs.map((log) => {
							const entityName = getEntityName(log);
							return (
								<div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
									<div className="flex items-start gap-3">
										<Activity className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
										<div className="flex-1">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="font-medium text-gray-900 dark:text-white">{log.full_name || log.username || "משתמש לא ידוע"}</span>
												<span className="text-gray-600 dark:text-gray-400">{getActionText(log)}</span>
												{log.table_name && <span className="text-gray-600 dark:text-gray-400">{getTableText(log.table_name)}</span>}
												{entityName && <span className="text-primary-600 dark:text-primary-400 font-medium">"{entityName}"</span>}
											</div>
											<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
												{new Date(log.created_at).toLocaleString("he-IL", {
													year: "numeric",
													month: "long",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</p>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default ActivityLog;
