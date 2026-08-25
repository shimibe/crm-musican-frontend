import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import { Users, CheckSquare, Activity, TrendingUp, Wrench } from "lucide-react";

const Dashboard = () => {
	const { user, isAdmin } = useAuth();
	const [stats, setStats] = useState(null);
	const [myTasks, setMyTasks] = useState([]);
	const [myTasksCount, setMyTasksCount] = useState(0);
	const [myRepairs, setMyRepairs] = useState([]);
	const [myRepairsCount, setMyRepairsCount] = useState(0);
	const [recentActivity, setRecentActivity] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadDashboardData();
	}, []);

	const loadDashboardData = async () => {
		try {
		//	console.log("loading Dashboard");

			const [tasksRes, repairsRes, activityRes] = await Promise.all([
				api.get("/tasks", { params: { assigned_to: user?.id } }),
				api.get("/repairs", { params: { mine: 'true', exclude_final: 'true', limit: 100 } }),
				api.get("/activity/my?limit=5")
			]);

			const rawActiveTasks = tasksRes.data.tasks
				.filter(task => task.status === 'open' || task.status === 'in_progress');
			setMyTasksCount(rawActiveTasks.length);
			setMyTasks(rawActiveTasks.slice(0, 5));

			const allRepairs = repairsRes.data.repairs || [];
			setMyRepairsCount(allRepairs.length);
			setMyRepairs(allRepairs.slice(0, 5));

			setRecentActivity(activityRes.data.logs);
//			console.log("myactivity - set!");

			if (isAdmin) {
//				console.log("is admin");
				const statsRes = await api.get("/admin/stats");
//				console.log({statsRes: statsRes});

				setStats(statsRes.data);
//				console.log("stats - set!");
			}
		} catch (error) {
			console.error("Error loading dashboard:", error);
		} finally {
			setLoading(false);
		}
	};

	const getPriorityColor = (priority) => {
		switch (priority) {
			case "high":
				return "text-red-600 dark:text-red-400";
			case "medium":
				return "text-yellow-600 dark:text-yellow-400";
			case "low":
				return "text-green-600 dark:text-green-400";
			default:
				return "text-gray-600 dark:text-gray-400";
		}
	};

	const getPriorityText = (priority) => {
		switch (priority) {
			case "high":
				return "גבוהה";
			case "medium":
				return "בינונית";
			case "low":
				return "נמוכה";
			default:
				return priority;
		}
	};

	const getStatusText = (status) => {
		switch (status) {
			case "open":
				return "פתוח";
			case "in_progress":
				return "בטיפול";
			case "closed":
				return "סגור";
			default:
				return status;
		}
	};

	const getRepairStatusClass = (color) => {
		const map = {
			red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
			yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
			green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
			blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
			orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
			purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
		};
		return map[color] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
			interests: "תחום עניין",
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

				// For interests, look for name
				if (log.table_name === "interests" && data.name) {
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

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-gray-500 dark:text-gray-400">טוען...</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Welcome */}
			<div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">שלום, {user?.fullName}</h1>
				<p className="text-gray-600 dark:text-gray-400">סקירה כללית של הפעילות שלך</p>
			</div>

			{/* Stats - Admin only */}
			{isAdmin && stats && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<Link to="/admin" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
						<div className="flex items-center">
							<Users className="w-8 h-8 text-primary-600" />
							<div className="mr-4">
								<p className="text-sm text-gray-600 dark:text-gray-400">משתמשים פעילים</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active_users}</p>
							</div>
						</div>
					</Link>

					<Link to="/customers" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
						<div className="flex items-center">
							<Users className="w-8 h-8 text-green-600" />
							<div className="mr-4">
								<p className="text-sm text-gray-600 dark:text-gray-400">לקוחות פעילים</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active_customers}</p>
							</div>
						</div>
					</Link>

					<Link to="/tasks" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
						<div className="flex items-center">
							<CheckSquare className="w-8 h-8 text-yellow-600" />
							<div className="mr-4">
								<p className="text-sm text-gray-600 dark:text-gray-400">משימות פתוחות</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.open_tasks}</p>
							</div>
						</div>
					</Link>

					<Link to="/activity" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
						<div className="flex items-center">
							<TrendingUp className="w-8 h-8 text-purple-600" />
							<div className="mr-4">
								<p className="text-sm text-gray-600 dark:text-gray-400">פעולות היום</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.actions_last_24h}</p>
							</div>
						</div>
					</Link>
				</div>
			)}

			{/* My Tasks */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">המשימות שלי</h2>
							{myTasksCount > 0 && (
								<span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">{myTasksCount}</span>
							)}
						</div>
						<Link to="/tasks" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
							צפה בהכל
						</Link>
					</div>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{myTasks.length === 0 ? (
						<div className="p-6 text-center text-gray-500 dark:text-gray-400">אין משימות פתוחות</div>
					) : (
						myTasks.map((task) => (
							<div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
								<div className="flex items-center justify-between">
									<div className="flex-1">
										<h3 className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</h3>
										{task.customer_name && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">לקוח: {task.customer_name}</p>}
									</div>
									<div className="flex items-center gap-2">
										<span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>{getPriorityText(task.priority)}</span>
										<span className="text-xs text-gray-500 dark:text-gray-400">{getStatusText(task.status)}</span>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* My Repairs */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Wrench className="w-5 h-5 text-gray-500 dark:text-gray-400" />
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">התיקונים שלי</h2>
							{myRepairsCount > 0 && (
								<span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">{myRepairsCount}</span>
							)}
						</div>
						<Link to="/repairs" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
							צפה בהכל
						</Link>
					</div>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{myRepairs.length === 0 ? (
						<div className="p-6 text-center text-gray-500 dark:text-gray-400">אין בקשות תיקון פתוחות</div>
					) : (
						myRepairs.map((repair) => (
							<div key={repair.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
								<div className="flex items-center justify-between gap-4">
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-900 dark:text-white truncate">
											{repair.details ? repair.details.substring(0, 60) + (repair.details.length > 60 ? '...' : '') : repair.type_name || 'ללא פירוט'}
										</p>
										<div className="flex items-center gap-3 mt-1 flex-wrap">
											{repair.type_name && <span className="text-xs text-gray-500 dark:text-gray-400">{repair.type_name}</span>}
											{repair.customer_name && <span className="text-xs text-gray-500 dark:text-gray-400">לקוח: {repair.customer_name}</span>}
										</div>
									</div>
									<div className="flex items-center gap-2 flex-shrink-0">
										{repair.status_name && (
											<span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRepairStatusClass(repair.status_color)}`}>
												{repair.status_name}
											</span>
										)}
										{repair.days_open != null && (
											<span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{repair.days_open} ימים</span>
										)}
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Recent Activity */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">פעילות אחרונה שלי</h2>
						<Link to="/activity" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
							צפה בהכל
						</Link>
					</div>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{recentActivity.length === 0 ? (
						<div className="p-6 text-center text-gray-500 dark:text-gray-400">אין פעילות אחרונה</div>
					) : (
						recentActivity.map((log) => {
							const entityName = getEntityName(log);
							return (
								<div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
									<div className="flex items-start gap-3">
										<Activity className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
										<div className="flex-1">
											<div className="flex items-center gap-2 flex-wrap">
												{log.via_api && log.api_token_name ? (
													<>
														<span className="font-medium text-gray-900 dark:text-white">{log.api_token_name}</span>
														<span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">API</span>
													</>
												) : (
													<span className="font-medium text-gray-900 dark:text-white">{log.full_name || log.username || "משתמש לא ידוע"}</span>
												)}
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
						})
					)}
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
