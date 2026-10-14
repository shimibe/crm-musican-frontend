import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import {
	Users, CheckSquare, Activity, TrendingUp, Wrench, Clock,
	DollarSign, ArrowUp, ArrowDown, EyeOff, Eye, FolderOpen,
} from "lucide-react";

// ─── Section definitions ──────────────────────────────────────────────────────
const SECTION_DEFS = [
	{ id: 'stats',    label: 'סטטיסטיקות',      adminOnly: true },
	{ id: 'shifts',   label: 'משמרות החודש' },
	{ id: 'projects', label: 'פרויקטים',         projectsOnly: true },
	{ id: 'sales',    label: 'מכירות החודש',     nonFreelancer: true },
	{ id: 'tasks',    label: 'המשימות שלי',      nonFreelancer: true },
	{ id: 'repairs',  label: 'התיקונים שלי',     nonFreelancer: true },
	{ id: 'activity', label: 'פעילות אחרונה',    nonFreelancer: true },
];

const PROJECT_STATUS_BADGE = {
	'פתוח':         'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
	'בעבודה':       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
	'ממתין לאישור': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
	'הסתיים':       'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const getDaysOpen = (project) => {
	const start = new Date(project.created_at);
	const label = project.status_label || 'פתוח';
	const end = label === 'הסתיים'
		? new Date(project.status_label_updated_at || Date.now())
		: new Date();
	return Math.max(0, Math.floor((end - start) / 86400000));
};

// ─── SectionHeader ────────────────────────────────────────────────────────────
const SectionHeader = ({ onHide, icon, title, badge, link, linkLabel }) => (
	<div className="p-6 border-b border-gray-200 dark:border-gray-700">
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				{icon}
				<h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
				{badge}
			</div>
			<div className="flex items-center gap-2">
				{link && (
					<Link to={link} className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
						{linkLabel || 'צפה בהכל'}
					</Link>
				)}
				<button
					onClick={onHide}
					className="p-1 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 rounded transition-colors"
					title="הסתר"
				>
					<EyeOff className="w-4 h-4" />
				</button>
			</div>
		</div>
	</div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
	const { user, isAdmin, updatePreferences } = useAuth();
	const isFreelancer = user?.role === 'freelancer';
	const isManager = user?.role === 'manager' || isAdmin;
	const canSeeProjects = isFreelancer || isAdmin || isManager;

	const [hiddenSections, setHiddenSections] = useState(
		() => user?.preferences?.dashboard_hidden_sections || []
	);

	const [stats, setStats] = useState(null);
	const [myTasks, setMyTasks] = useState([]);
	const [myTasksCount, setMyTasksCount] = useState(0);
	const [myRepairs, setMyRepairs] = useState([]);
	const [myRepairsCount, setMyRepairsCount] = useState(0);
	const [recentActivity, setRecentActivity] = useState([]);
	const [monthShifts, setMonthShifts] = useState(null);
	const [salesStats, setSalesStats] = useState(null);
	const [myProjects, setMyProjects] = useState([]);
	const [loading, setLoading] = useState(true);

	// ─── Section visibility ───────────────────────────────────────────────────
	const isHidden = (id) => hiddenSections.includes(id);

	const hideSection = (id) => {
		const next = [...hiddenSections, id];
		setHiddenSections(next);
		updatePreferences({ ...user.preferences, dashboard_hidden_sections: next });
	};

	const showSection = (id) => {
		const next = hiddenSections.filter(s => s !== id);
		setHiddenSections(next);
		updatePreferences({ ...user.preferences, dashboard_hidden_sections: next });
	};

	// sections that are applicable to this user AND currently hidden
	const restorableHidden = SECTION_DEFS.filter(s => {
		if (!hiddenSections.includes(s.id)) return false;
		if (s.adminOnly && !isAdmin) return false;
		if (s.projectsOnly && !canSeeProjects) return false;
		if (s.nonFreelancer && isFreelancer) return false;
		return true;
	});

	// ─── Data loading ─────────────────────────────────────────────────────────
	useEffect(() => {
		loadDashboardData();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const loadDashboardData = async () => {
		const now = new Date();
		const month = now.getMonth() + 1;
		const year = now.getFullYear();
		const prevMonth = month === 1 ? 12 : month - 1;
		const prevYear = month === 1 ? year - 1 : year;

		try {
			if (isFreelancer) {
				const [shiftsRes, projectsRes] = await Promise.allSettled([
					api.get('/attendance/shifts', { params: { month, year } }),
					api.get('/freelance-projects', { params: { status: 'active' } }),
				]);
				if (shiftsRes.status === 'fulfilled') setMonthShifts(shiftsRes.value.data.totals);
				if (projectsRes.status === 'fulfilled') setMyProjects(projectsRes.value.data || []);
			} else {
				const requests = [
					api.get("/tasks", { params: { assigned_to: user?.id } }),
					api.get("/repairs", { params: { mine: 'true', exclude_final: 'true', limit: 100 } }),
					api.get("/activity/my?limit=5"),
					api.get('/attendance/shifts', { params: { month, year } }),
					api.get('/sales', { params: { month, year, limit: 9999 } }),
					api.get('/sales', { params: { month: prevMonth, year: prevYear, limit: 9999 } }),
					api.get('/sales', { params: { month, year: year - 1, limit: 9999 } }),
					...(canSeeProjects ? [api.get('/freelance-projects', { params: { status: 'active' } })] : []),
				];

				const results = await Promise.allSettled(requests);
				const [tasksRes, repairsRes, activityRes, shiftsRes, salesCurrent, salesPrev, salesYearAgo, projectsRes] = results;

				if (tasksRes.status === 'fulfilled') {
					const rawActiveTasks = (tasksRes.value.data.tasks || [])
						.filter(task => task.status === 'open' || task.status === 'in_progress');
					setMyTasksCount(rawActiveTasks.length);
					setMyTasks(rawActiveTasks.slice(0, 5));
				}
				if (repairsRes.status === 'fulfilled') {
					const allRepairs = repairsRes.value.data.repairs || [];
					setMyRepairsCount(allRepairs.length);
					setMyRepairs(allRepairs.slice(0, 5));
				}
				if (activityRes.status === 'fulfilled') setRecentActivity(activityRes.value.data.logs || []);
				if (shiftsRes.status === 'fulfilled') setMonthShifts(shiftsRes.value.data.totals);
				if (projectsRes?.status === 'fulfilled') setMyProjects(projectsRes.value.data || []);

				const currentTotal = salesCurrent.status === 'fulfilled'
					? parseFloat(salesCurrent.value.data.totals?.totalSales) || 0 : null;
				const currentCount = salesCurrent.status === 'fulfilled'
					? (salesCurrent.value.data.sales?.length ?? 0) : null;
				const prevTotal = salesPrev.status === 'fulfilled'
					? parseFloat(salesPrev.value.data.totals?.totalSales) || 0 : null;
				const yearAgoTotal = salesYearAgo.status === 'fulfilled'
					? parseFloat(salesYearAgo.value.data.totals?.totalSales) || 0 : null;
				if (currentTotal !== null) setSalesStats({ currentTotal, currentCount, prevTotal, yearAgoTotal });

				if (isAdmin) {
					const statsRes = await api.get("/admin/stats");
					setStats(statsRes.data);
				}
			}
		} catch (error) {
			console.error("Error loading dashboard:", error);
		} finally {
			setLoading(false);
		}
	};

	// ─── Helpers ──────────────────────────────────────────────────────────────
	const calcChange = (current, previous) => {
		if (previous === null || previous === 0) return null;
		return ((current - previous) / previous * 100).toFixed(1);
	};

	const formatCurrency = (amount) =>
		new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);

	const ChangeChip = ({ value }) => {
		if (value === null) return <span className="text-xs text-gray-400">אין נתון</span>;
		const num = parseFloat(value);
		const isUp = num >= 0;
		return (
			<span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
				{isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
				{Math.abs(num)}%
			</span>
		);
	};

	const getPriorityColor = (p) => ({ high: "text-red-600 dark:text-red-400", medium: "text-yellow-600 dark:text-yellow-400", low: "text-green-600 dark:text-green-400" }[p] || "text-gray-600 dark:text-gray-400");
	const getPriorityText = (p) => ({ high: "גבוהה", medium: "בינונית", low: "נמוכה" }[p] || p);
	const getStatusText = (s) => ({ open: "פתוח", in_progress: "בטיפול", closed: "סגור" }[s] || s);

	const getRepairStatusClass = (color) => ({
		red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
		yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
		green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
		blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
		orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
		purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
	}[color] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300');

	const getActionText = (log) => {
		let action = log.action;
		if (action === "update" && log.details?.body?.status && Object.keys(log.details.body).length === 1)
			action = log.details.body.status === "open" ? "open" : "close";
		return ({ create: "יצר", update: "עדכן", delete: "מחק", login: "התחבר", open: "פתח", close: "סגר" }[action] || action);
	};

	const getTableText = (table) =>
		({ customers: "לקוח", tasks: "משימה", users: "משתמש", categories: "קטגוריה", interests: "תחום עניין" }[table] || table);

	const getEntityName = (log) => {
		if (log.details) {
			try {
				const details = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
				const data = details.body || details;
				if (log.table_name === "tasks" && data.title) return data.title;
				if (log.table_name === "customers" && data.name) return data.name;
				if (log.table_name === "categories" && data.name) return data.name;
				if (log.table_name === "interests" && data.name) return data.name;
				if (log.table_name === "users") return data.full_name || data.username || details.username;
			} catch (e) {}
		}
		return null;
	};

	// Projects summary for admin
	const projectStatusCounts = myProjects.reduce((acc, p) => {
		const label = p.status_label || 'פתוח';
		acc[label] = (acc[label] || 0) + 1;
		return acc;
	}, {});

	const now = new Date();
	const monthName = now.toLocaleString('he-IL', { month: 'long' });

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-gray-500 dark:text-gray-400">טוען...</div>
			</div>
		);
	}

	const BadgeCount = ({ count }) => count > 0
		? <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">{count}</span>
		: null;

	return (
		<div className="space-y-6">
			{/* Welcome */}
			<div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">שלום, {user?.fullName}</h1>
				<p className="text-gray-600 dark:text-gray-400">סקירה כללית של הפעילות שלך</p>
			</div>

			{/* Restore hidden sections */}
			{restorableHidden.length > 0 && (
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-xs text-gray-400 dark:text-gray-500">מוסתרים:</span>
					{restorableHidden.map(s => (
						<button
							key={s.id}
							onClick={() => showSection(s.id)}
							className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
						>
							<Eye className="w-3 h-3" />
							{s.label}
						</button>
					))}
				</div>
			)}

			{/* Stats — Admin only */}
			{isAdmin && stats && !isHidden('stats') && (
				<div className="relative">
					<button
						onClick={() => hideSection('stats')}
						className="absolute -top-2 left-0 z-10 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
						title="הסתר"
					>
						<EyeOff className="w-3.5 h-3.5" />
					</button>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
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
				</div>
			)}

			{/* משמרות החודש */}
			{monthShifts && !isHidden('shifts') && (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
					<SectionHeader
						onHide={() => hideSection('shifts')}
						icon={<Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
						title={`משמרות ${monthName}`}
						link="/attendance"
						linkLabel="לדף נוכחות"
					/>
					<div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="text-center">
							<p className="text-2xl font-bold text-gray-900 dark:text-white">{parseFloat(monthShifts.totalHours).toFixed(1)}</p>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">שעות סה"כ</p>
						</div>
						<div className="text-center">
							<p className="text-2xl font-bold text-gray-900 dark:text-white">{monthShifts.totalDays}</p>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ימי עבודה</p>
						</div>
						<div className="text-center">
							<p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{monthShifts.workFromOffice}</p>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ימי משרד</p>
						</div>
						<div className="text-center">
							<p className="text-2xl font-bold text-green-600 dark:text-green-400">{monthShifts.workFromHome}</p>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ימי בית</p>
						</div>
					</div>
					{monthShifts.estimatedSalary > 0 && (
						<div className="px-6 pb-6">
							<div className="bg-gray-50 dark:bg-gray-700/50 rounded-md px-4 py-3 flex justify-between items-center">
								<span className="text-sm text-gray-600 dark:text-gray-400">שכר משוער</span>
								<span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(monthShifts.estimatedSalary)}</span>
							</div>
						</div>
					)}
				</div>
			)}

			{/* פרויקטים */}
			{canSeeProjects && !isHidden('projects') && (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
					<SectionHeader
						onHide={() => hideSection('projects')}
						icon={<FolderOpen className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
						title="פרויקטים פעילים"
						badge={myProjects.length > 0 && (
							<span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-blue-500 rounded-full">
								{myProjects.length}
							</span>
						)}
						link="/freelance-projects"
						linkLabel="לדף פרויקטים"
					/>
					{myProjects.length === 0 ? (
						<div className="p-6 text-center text-gray-500 dark:text-gray-400">אין פרויקטים פעילים</div>
					) : isFreelancer ? (
						// Freelancer: full list
						<div className="divide-y divide-gray-200 dark:divide-gray-700">
							{myProjects.map(p => {
								const label = p.status_label || 'פתוח';
								const days = getDaysOpen(p);
								return (
									<div key={p.id} className="p-4 flex items-center justify-between gap-4">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												{p.project_code && (
													<span className="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0">#{p.project_code}</span>
												)}
												<span className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</span>
											</div>
											{p.description && (
												<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{p.description}</p>
											)}
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROJECT_STATUS_BADGE[label] || PROJECT_STATUS_BADGE['פתוח']}`}>
												{label}
											</span>
											<span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
												{days === 0 ? 'היום' : `${days} ימים`}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						// Admin/Manager: summary + recent list
						<div>
							<div className="px-6 pt-4 pb-2 flex flex-wrap gap-2">
								{Object.entries(projectStatusCounts).map(([label, count]) => (
									<span key={label} className={`text-xs px-2.5 py-1 rounded-full font-medium ${PROJECT_STATUS_BADGE[label] || PROJECT_STATUS_BADGE['פתוח']}`}>
										{label}: {count}
									</span>
								))}
							</div>
							<div className="divide-y divide-gray-200 dark:divide-gray-700">
								{myProjects.slice(0, 6).map(p => {
									const label = p.status_label || 'פתוח';
									const days = getDaysOpen(p);
									return (
										<div key={p.id} className="px-6 py-3 flex items-center justify-between gap-4">
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													{p.project_code && (
														<span className="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0">#{p.project_code}</span>
													)}
													<span className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</span>
												</div>
												{p.freelancer_name && (
													<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.freelancer_name}</p>
												)}
											</div>
											<div className="flex items-center gap-2 shrink-0">
												<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROJECT_STATUS_BADGE[label] || PROJECT_STATUS_BADGE['פתוח']}`}>
													{label}
												</span>
												<span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
													{days === 0 ? 'היום' : `${days} ימים`}
												</span>
											</div>
										</div>
									);
								})}
								{myProjects.length > 6 && (
									<div className="px-6 py-3 text-xs text-gray-400 dark:text-gray-500">
										ועוד {myProjects.length - 6} פרויקטים...
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			)}

			{/* מכירות החודש */}
			{!isFreelancer && salesStats !== null && !isHidden('sales') && (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
					<SectionHeader
						onHide={() => hideSection('sales')}
						icon={<DollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
						title={`מכירות ${monthName}`}
						link="/sales"
						linkLabel="לדף מכירות"
					/>
					<div className="p-6">
						<div className="flex items-end gap-3 mb-4">
							<span className="text-3xl font-bold text-gray-900 dark:text-white">
								{formatCurrency(salesStats.currentTotal)}
							</span>
							{salesStats.currentCount !== null && (
								<span className="text-sm text-gray-500 dark:text-gray-400 mb-1">({salesStats.currentCount} מכירות)</span>
							)}
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="bg-gray-50 dark:bg-gray-700/50 rounded-md px-4 py-3">
								<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">לעומת החודש הקודם</p>
								<ChangeChip value={calcChange(salesStats.currentTotal, salesStats.prevTotal)} />
							</div>
							<div className="bg-gray-50 dark:bg-gray-700/50 rounded-md px-4 py-3">
								<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">לעומת {monthName} אשתקד</p>
								<ChangeChip value={calcChange(salesStats.currentTotal, salesStats.yearAgoTotal)} />
							</div>
						</div>
					</div>
				</div>
			)}

			{/* המשימות שלי */}
			{!isFreelancer && !isHidden('tasks') && (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
					<SectionHeader
						onHide={() => hideSection('tasks')}
						title="המשימות שלי"
						badge={<BadgeCount count={myTasksCount} />}
						link="/tasks"
					/>
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
			)}

			{/* התיקונים שלי */}
			{!isFreelancer && !isHidden('repairs') && (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
					<SectionHeader
						onHide={() => hideSection('repairs')}
						icon={<Wrench className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
						title="התיקונים שלי"
						badge={<BadgeCount count={myRepairsCount} />}
						link="/repairs"
					/>
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
			)}

			{/* פעילות אחרונה */}
			{!isFreelancer && !isHidden('activity') && (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow">
					<SectionHeader
						onHide={() => hideSection('activity')}
						title="פעילות אחרונה שלי"
						link="/activity"
					/>
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
														year: "numeric", month: "long", day: "numeric",
														hour: "2-digit", minute: "2-digit",
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
			)}
		</div>
	);
};

export default Dashboard;
