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
	'פתוח':         'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
	'בעבודה':       'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400',
	'ממתין לאישור': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
	'הסתיים':       'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400',
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
	<div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				{icon && <span className="text-primary-500 dark:text-primary-400">{icon}</span>}
				<h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
				{badge}
			</div>
			<div className="flex items-center gap-2">
				{link && (
					<Link to={link} className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
						{linkLabel || 'צפה בהכל'}
					</Link>
				)}
				<button
					onClick={onHide}
					className="p-1 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 rounded-md transition-colors"
					title="הסתר"
				>
					<EyeOff className="w-3.5 h-3.5" />
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
		if (value === null) return <span className="text-xs text-slate-400">אין נתון</span>;
		const num = parseFloat(value);
		const isUp = num >= 0;
		return (
			<span className={`inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
				{isUp ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
				{Math.abs(num)}%
			</span>
		);
	};

	const getPriorityColor = (p) => ({
		high:   "text-red-500 dark:text-red-400",
		medium: "text-amber-500 dark:text-amber-400",
		low:    "text-emerald-600 dark:text-emerald-400",
		urgent: "text-red-600 dark:text-red-300 font-bold",
	}[p] || "text-slate-400");
	const getPriorityText = (p) => ({ high: "גבוהה", medium: "בינונית", low: "נמוכה", urgent: "דחוף" }[p] || p);
	const getStatusText = (s) => ({ open: "פתוח", in_progress: "בטיפול", closed: "סגור" }[s] || s);

	const getRepairStatusClass = (color) => ({
		red:    'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
		yellow: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
		green:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
		blue:   'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400',
		orange: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
		purple: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
	}[color] || 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400');

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
			<div className="flex flex-col items-center justify-center h-64 gap-3">
				<div className="w-8 h-8 rounded-full border-[3px] border-slate-200 dark:border-slate-700 border-t-primary-600 animate-spin" />
				<span className="text-sm text-slate-400 dark:text-slate-500">טוען...</span>
			</div>
		);
	}

	const BadgeCount = ({ count }) => count > 0
		? <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">{count}</span>
		: null;

	// Shared card class
	const card = "bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700/50";
	const rowHover = "hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors";

	return (
		<div className="space-y-5 max-w-4xl">
			{/* Welcome */}
			<div className="pt-1">
				<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
					שלום, {user?.fullName}
				</h1>
				<p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
					סקירה כללית של הפעילות שלך
				</p>
			</div>

			{/* Restore hidden sections */}
			{restorableHidden.length > 0 && (
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-xs text-slate-400 dark:text-slate-500">מוסתרים:</span>
					{restorableHidden.map(s => (
						<button
							key={s.id}
							onClick={() => showSection(s.id)}
							className="flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
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
						className="absolute -top-1 left-0 z-10 flex items-center gap-1 text-xs text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors"
						title="הסתר"
					>
						<EyeOff className="w-3.5 h-3.5" />
					</button>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
						<Link to="/admin" className={`${card} p-5 hover:border-primary-300 dark:hover:border-primary-600/50 transition-colors`}>
							<p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">משתמשים פעילים</p>
							<p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{stats.active_users}</p>
						</Link>
						<Link to="/customers" className={`${card} p-5 hover:border-primary-300 dark:hover:border-primary-600/50 transition-colors`}>
							<p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">לקוחות פעילים</p>
							<p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{stats.active_customers}</p>
						</Link>
						<Link to="/tasks" className={`${card} p-5 hover:border-primary-300 dark:hover:border-primary-600/50 transition-colors`}>
							<p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">משימות פתוחות</p>
							<p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{stats.open_tasks}</p>
						</Link>
						<Link to="/activity" className={`${card} p-5 hover:border-primary-300 dark:hover:border-primary-600/50 transition-colors`}>
							<p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">פעולות היום</p>
							<p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{stats.actions_last_24h}</p>
						</Link>
					</div>
				</div>
			)}

			{/* משמרות החודש */}
			{monthShifts && !isHidden('shifts') && (
				<div className={card}>
					<SectionHeader
						onHide={() => hideSection('shifts')}
						icon={<Clock className="w-4 h-4" />}
						title={`משמרות ${monthName}`}
						link="/attendance"
						linkLabel="לדף נוכחות"
					/>
					<div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
						<div>
							<p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{parseFloat(monthShifts.totalHours).toFixed(1)}</p>
							<p className="text-xs text-slate-400 dark:text-slate-500 mt-1">שעות סה"כ</p>
						</div>
						<div>
							<p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{monthShifts.totalDays}</p>
							<p className="text-xs text-slate-400 dark:text-slate-500 mt-1">ימי עבודה</p>
						</div>
						<div>
							<p className="text-2xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">{monthShifts.workFromOffice}</p>
							<p className="text-xs text-slate-400 dark:text-slate-500 mt-1">ימי משרד</p>
						</div>
						<div>
							<p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{monthShifts.workFromHome}</p>
							<p className="text-xs text-slate-400 dark:text-slate-500 mt-1">ימי בית</p>
						</div>
					</div>
					{monthShifts.estimatedSalary > 0 && (
						<div className="px-5 pb-5">
							<div className="bg-slate-50 dark:bg-white/[0.03] rounded-lg px-4 py-3 flex justify-between items-center border border-slate-100 dark:border-slate-700/30">
								<span className="text-xs text-slate-500 dark:text-slate-400">שכר משוער</span>
								<span className="text-sm font-semibold text-slate-800 dark:text-white tabular-nums">{formatCurrency(monthShifts.estimatedSalary)}</span>
							</div>
						</div>
					)}
				</div>
			)}

			{/* פרויקטים */}
			{canSeeProjects && !isHidden('projects') && (
				<div className={card}>
					<SectionHeader
						onHide={() => hideSection('projects')}
						icon={<FolderOpen className="w-4 h-4" />}
						title="פרויקטים פעילים"
						badge={myProjects.length > 0 && (
							<span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-primary-500 rounded-full">
								{myProjects.length}
							</span>
						)}
						link="/freelance-projects"
						linkLabel="לדף פרויקטים"
					/>
					{myProjects.length === 0 ? (
						<div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">אין פרויקטים פעילים</div>
					) : isFreelancer ? (
						<div className="divide-y divide-slate-100 dark:divide-slate-700/50">
							{myProjects.map(p => {
								const label = p.status_label || 'פתוח';
								const days = getDaysOpen(p);
								return (
									<div key={p.id} className={`px-5 py-3.5 flex items-center justify-between gap-4 ${rowHover}`}>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												{p.project_code && (
													<span className="text-xs font-mono text-slate-400 dark:text-slate-500 shrink-0">#{p.project_code}</span>
												)}
												<span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{p.name}</span>
											</div>
											{p.description && (
												<p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{p.description}</p>
											)}
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROJECT_STATUS_BADGE[label] || PROJECT_STATUS_BADGE['פתוח']}`}>
												{label}
											</span>
											<span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">
												{days === 0 ? 'היום' : `${days} ימים`}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div>
							<div className="px-5 pt-4 pb-2 flex flex-wrap gap-1.5">
								{Object.entries(projectStatusCounts).map(([label, count]) => (
									<span key={label} className={`text-xs px-2.5 py-1 rounded-full font-medium ${PROJECT_STATUS_BADGE[label] || PROJECT_STATUS_BADGE['פתוח']}`}>
										{label}: {count}
									</span>
								))}
							</div>
							<div className="divide-y divide-slate-100 dark:divide-slate-700/50">
								{myProjects.slice(0, 6).map(p => {
									const label = p.status_label || 'פתוח';
									const days = getDaysOpen(p);
									return (
										<div key={p.id} className={`px-5 py-3 flex items-center justify-between gap-4 ${rowHover}`}>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													{p.project_code && (
														<span className="text-xs font-mono text-slate-400 dark:text-slate-500 shrink-0">#{p.project_code}</span>
													)}
													<span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{p.name}</span>
												</div>
												{p.freelancer_name && (
													<p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{p.freelancer_name}</p>
												)}
											</div>
											<div className="flex items-center gap-2 shrink-0">
												<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROJECT_STATUS_BADGE[label] || PROJECT_STATUS_BADGE['פתוח']}`}>
													{label}
												</span>
												<span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">
													{days === 0 ? 'היום' : `${days} ימים`}
												</span>
											</div>
										</div>
									);
								})}
								{myProjects.length > 6 && (
									<div className="px-5 py-3 text-xs text-slate-400 dark:text-slate-500">
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
				<div className={card}>
					<SectionHeader
						onHide={() => hideSection('sales')}
						icon={<DollarSign className="w-4 h-4" />}
						title={`מכירות ${monthName}`}
						link="/sales"
						linkLabel="לדף מכירות"
					/>
					<div className="p-5">
						<div className="flex items-end gap-2.5 mb-4">
							<span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
								{formatCurrency(salesStats.currentTotal)}
							</span>
							{salesStats.currentCount !== null && (
								<span className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">({salesStats.currentCount} מכירות)</span>
							)}
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="bg-slate-50 dark:bg-white/[0.03] rounded-lg px-4 py-3 border border-slate-100 dark:border-slate-700/30">
								<p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">לעומת החודש הקודם</p>
								<ChangeChip value={calcChange(salesStats.currentTotal, salesStats.prevTotal)} />
							</div>
							<div className="bg-slate-50 dark:bg-white/[0.03] rounded-lg px-4 py-3 border border-slate-100 dark:border-slate-700/30">
								<p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">לעומת {monthName} אשתקד</p>
								<ChangeChip value={calcChange(salesStats.currentTotal, salesStats.yearAgoTotal)} />
							</div>
						</div>
					</div>
				</div>
			)}

			{/* המשימות שלי */}
			{!isFreelancer && !isHidden('tasks') && (
				<div className={card}>
					<SectionHeader
						onHide={() => hideSection('tasks')}
						icon={<CheckSquare className="w-4 h-4" />}
						title="המשימות שלי"
						badge={<BadgeCount count={myTasksCount} />}
						link="/tasks"
					/>
					<div className="divide-y divide-slate-100 dark:divide-slate-700/50">
						{myTasks.length === 0 ? (
							<div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">אין משימות פתוחות</div>
						) : (
							myTasks.map((task) => (
								<div key={task.id} className={`px-5 py-3.5 ${rowHover}`}>
									<div className="flex items-center justify-between gap-4">
										<div className="flex-1 min-w-0">
											<h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{task.title}</h3>
											{task.customer_name && (
												<p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">לקוח: {task.customer_name}</p>
											)}
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
												{getPriorityText(task.priority)}
											</span>
											<span className="text-xs text-slate-400 dark:text-slate-500">{getStatusText(task.status)}</span>
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
				<div className={card}>
					<SectionHeader
						onHide={() => hideSection('repairs')}
						icon={<Wrench className="w-4 h-4" />}
						title="התיקונים שלי"
						badge={<BadgeCount count={myRepairsCount} />}
						link="/repairs"
					/>
					<div className="divide-y divide-slate-100 dark:divide-slate-700/50">
						{myRepairs.length === 0 ? (
							<div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">אין בקשות תיקון פתוחות</div>
						) : (
							myRepairs.map((repair) => (
								<div key={repair.id} className={`px-5 py-3.5 ${rowHover}`}>
									<div className="flex items-center justify-between gap-4">
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
												{repair.details ? repair.details.substring(0, 60) + (repair.details.length > 60 ? '...' : '') : repair.type_name || 'ללא פירוט'}
											</p>
											<div className="flex items-center gap-3 mt-0.5 flex-wrap">
												{repair.type_name && <span className="text-xs text-slate-400 dark:text-slate-500">{repair.type_name}</span>}
												{repair.customer_name && <span className="text-xs text-slate-400 dark:text-slate-500">לקוח: {repair.customer_name}</span>}
											</div>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											{repair.status_name && (
												<span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRepairStatusClass(repair.status_color)}`}>
													{repair.status_name}
												</span>
											)}
											{repair.days_open != null && (
												<span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">{repair.days_open} ימים</span>
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
				<div className={card}>
					<SectionHeader
						onHide={() => hideSection('activity')}
						icon={<Activity className="w-4 h-4" />}
						title="פעילות אחרונה שלי"
						link="/activity"
					/>
					<div className="divide-y divide-slate-100 dark:divide-slate-700/50">
						{recentActivity.length === 0 ? (
							<div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">אין פעילות אחרונה</div>
						) : (
							recentActivity.map((log) => {
								const entityName = getEntityName(log);
								return (
									<div key={log.id} className={`px-5 py-3.5 ${rowHover}`}>
										<div className="flex items-start gap-3">
											<div className="w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0 mt-0.5">
												<Activity className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-1.5 flex-wrap text-sm">
													{log.via_api && log.api_token_name ? (
														<>
															<span className="font-semibold text-slate-800 dark:text-slate-100">{log.api_token_name}</span>
															<span className="px-1.5 py-0.5 text-xs bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400 rounded font-medium">API</span>
														</>
													) : (
														<span className="font-semibold text-slate-800 dark:text-slate-100">{log.full_name || log.username || "משתמש לא ידוע"}</span>
													)}
													<span className="text-slate-500 dark:text-slate-400">{getActionText(log)}</span>
													{log.table_name && <span className="text-slate-500 dark:text-slate-400">{getTableText(log.table_name)}</span>}
													{entityName && <span className="text-primary-600 dark:text-primary-400 font-medium truncate">"{entityName}"</span>}
												</div>
												<p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
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
