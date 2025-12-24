import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import { Users, CheckSquare, AlertCircle, TrendingUp } from "lucide-react";

const Dashboard = () => {
	const { user, isAdmin } = useAuth();
	const [stats, setStats] = useState(null);
	const [myTasks, setMyTasks] = useState([]);
	const [recentActivity, setRecentActivity] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadDashboardData();
	}, []);

	const loadDashboardData = async () => {
		try {
			console.log("loading Dashboard");

			const [tasksRes, activityRes] = await Promise.all([
				api.get("/tasks", { params: { assigned_to: user?.id } }),
				api.get("/activity/my?limit=5")
			]);

			console.log({
				tasksRes: tasksRes,
				activityRes: activityRes,
			});

			// Filter to show only open and in_progress tasks, and limit to 5
			const myActiveTasks = tasksRes.data.tasks
				.filter(task => task.status === 'open' || task.status === 'in_progress')
				.slice(0, 5);

			setMyTasks(myActiveTasks);
			console.log("mytesks - set!");

			setRecentActivity(activityRes.data.logs);
			console.log("myactivity - set!");

			if (isAdmin) {
				console.log("is admin");
				const statsRes = await api.get("/admin/stats");
				console.log({statsRes: statsRes});

				setStats(statsRes.data);
				console.log("stats - set!");
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

	const getActionText = (action) => {
		switch (action) {
			case "create":
				return "יצר";
			case "update":
				return "עדכן";
			case "delete":
				return "מחק";
			case "login":
				return "התחבר";
			default:
				return action;
		}
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
					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
						<div className="flex items-center">
							<Users className="w-8 h-8 text-primary-600" />
							<div className="mr-4">
								<p className="text-sm text-gray-600 dark:text-gray-400">משתמשים פעילים</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active_users}</p>
							</div>
						</div>
					</div>

					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
						<div className="flex items-center">
							<Users className="w-8 h-8 text-green-600" />
							<div className="mr-4">
								<p className="text-sm text-gray-600 dark:text-gray-400">לקוחות פעילים</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active_customers}</p>
							</div>
						</div>
					</div>

					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
						<div className="flex items-center">
							<CheckSquare className="w-8 h-8 text-yellow-600" />
							<div className="mr-4">
								<p className="text-sm text-gray-600 dark:text-gray-400">משימות פתוחות</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.open_tasks}</p>
							</div>
						</div>
					</div>

					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
						<div className="flex items-center">
							<TrendingUp className="w-8 h-8 text-purple-600" />
							<div className="mr-4">
								<p className="text-sm text-gray-600 dark:text-gray-400">פעולות היום</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.actions_last_24h}</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* My Tasks */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">המשימות שלי</h2>
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

			{/* Recent Activity */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white">פעילות אחרונה שלי</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{recentActivity.length === 0 ? (
						<div className="p-6 text-center text-gray-500 dark:text-gray-400">אין פעילות אחרונה</div>
					) : (
						recentActivity.map((activity) => (
							<div key={activity.id} className="p-4">
								<div className="flex items-center gap-3">
									<AlertCircle className="w-4 h-4 text-gray-400" />
									<div className="flex-1">
										<p className="text-sm text-gray-900 dark:text-white">
											{getActionText(activity.action)} {activity.table_name}
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">{new Date(activity.created_at).toLocaleString("he-IL")}</p>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
