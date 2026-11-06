import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  Filter,
  User,
  Store as StoreIcon,
  Tag,
  ArrowRight,
  X,
  Sparkles
} from 'lucide-react';
import { FollowUpTask, Store, Promotion, UserProfile, Language, TaskPriority, TaskStatus } from '../types';
import { translations } from '../i18n/translations';
import { dataService } from '../services/dataService';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface TodoListViewProps {
  tasks: FollowUpTask[];
  stores: Store[];
  promotions: Promotion[];
  salesReps: UserProfile[];
  currentUser: UserProfile;
  language: Language;
  onRefreshData: () => void;
  onNavigateTab: (tab: 'dashboard' | 'stores' | 'promotions' | 'tracking' | 'excel') => void;
}

export const TodoListView: React.FC<TodoListViewProps> = ({
  tasks,
  stores,
  promotions,
  salesReps,
  currentUser,
  language,
  onRefreshData,
  onNavigateTab
}) => {
  const t = translations[language];

  // Filters (5 tabs: All, Today, Upcoming, Overdue, Completed)
  const [tabFilter, setTabFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [salesFilter, setSalesFilter] = useState<string>(
    currentUser.role === 'sales' ? currentUser.id : 'all'
  );

  // Modals
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FollowUpTask | null>(null);

  // Form
  const [taskTitle, setTaskTitle] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || '');
  const [selectedPromoId, setSelectedPromoId] = useState(promotions[0]?.id || '');
  const [assignedUser, setAssignedUser] = useState(currentUser.id);
  const [dueDate, setDueDate] = useState(new Date().toISOString().substring(0, 10));
  const [priority, setPriority] = useState<TaskPriority>('High');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('Pending');
  const [remark, setRemark] = useState('');

  // Maps
  const storeMap = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const promoMap = useMemo(() => new Map(promotions.map((p) => [p.id, p])), [promotions]);
  const userMap = useMemo(() => new Map(dataService.getAllUsers().map((u) => [u.id, u.fullName])), []);

  // Today start and end timestamps
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000;

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const taskDueTime = new Date(task.dueDate).getTime();
      const isPastDue = taskDueTime < startOfToday && task.taskStatus !== 'Completed' && task.taskStatus !== 'Cancelled';
      const isToday = taskDueTime >= startOfToday && taskDueTime < endOfToday;
      const isUpcoming = taskDueTime >= endOfToday && task.taskStatus !== 'Completed' && task.taskStatus !== 'Cancelled';

      // Tab Filter
      if (tabFilter === 'today' && !isToday) return false;
      if (tabFilter === 'upcoming' && !isUpcoming) return false;
      if (tabFilter === 'overdue' && !isPastDue) return false;
      if (tabFilter === 'completed' && task.taskStatus !== 'Completed') return false;

      // Priority Filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      // Sales User Filter
      if (salesFilter !== 'all' && task.assignedUser !== salesFilter) return false;

      return true;
    });
  }, [tasks, tabFilter, priorityFilter, salesFilter, startOfToday, endOfToday]);

  const openNewTaskModal = () => {
    triggerHaptic('medium');
    setTaskTitle('');
    setSelectedStoreId(stores[0]?.id || '');
    setSelectedPromoId(promotions[0]?.id || '');
    setAssignedUser(currentUser.id);
    setDueDate(new Date(Date.now() + 86400000).toISOString().substring(0, 10));
    setPriority('High');
    setTaskStatus('Pending');
    setRemark('');
    setIsNewTaskOpen(true);
  };

  const openEditModal = (task: FollowUpTask) => {
    triggerHaptic('light');
    setEditingTask(task);
    setTaskTitle(task.taskTitle);
    setSelectedStoreId(task.storeId);
    setSelectedPromoId(task.promotionId || '');
    setAssignedUser(task.assignedUser);
    setDueDate(task.dueDate ? task.dueDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
    setPriority(task.priority);
    setTaskStatus(task.taskStatus);
    setRemark(task.remark || '');
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    triggerHaptic('medium');
    if (editingTask) {
      dataService.updateTask(editingTask.id, {
        taskTitle,
        storeId: selectedStoreId,
        promotionId: selectedPromoId || undefined,
        assignedUser,
        dueDate: new Date(dueDate).toISOString(),
        priority,
        taskStatus,
        remark
      });
      setEditingTask(null);
    } else {
      dataService.createTask({
        taskTitle,
        storeId: selectedStoreId,
        promotionId: selectedPromoId || undefined,
        assignedUser,
        dueDate: new Date(dueDate).toISOString(),
        priority,
        taskStatus: 'Pending',
        remark
      });
      setIsNewTaskOpen(false);
    }

    onRefreshData();
  };

  const handleQuickComplete = (taskId: string) => {
    triggerHaptic('success');
    dataService.updateTask(taskId, { taskStatus: 'Completed' });
    try {
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.7 }
      });
    } catch {
      // safe fallback
    }
    onRefreshData();
  };

  const handleDeleteTask = (taskId: string) => {
    triggerHaptic('warning');
    if (confirm('Delete this task?')) {
      dataService.deleteTask(taskId);
      onRefreshData();
    }
  };

  // Counts for tabs
  const overdueCount = tasks.filter((t) => {
    const due = new Date(t.dueDate).getTime();
    return due < startOfToday && t.taskStatus !== 'Completed' && t.taskStatus !== 'Cancelled';
  }).length;

  const todayCount = tasks.filter((t) => {
    const due = new Date(t.dueDate).getTime();
    return due >= startOfToday && due < endOfToday && t.taskStatus !== 'Completed';
  }).length;

  const upcomingCount = tasks.filter((t) => {
    const due = new Date(t.dueDate).getTime();
    return due >= endOfToday && t.taskStatus !== 'Completed' && t.taskStatus !== 'Cancelled';
  }).length;

  const completedCount = tasks.filter((t) => t.taskStatus === 'Completed').length;

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.tasksTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.tasksSubtitle}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={openNewTaskModal}
          className="hidden sm:flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t.newTask}</span>
        </motion.button>
      </div>

      {/* Filter Tabs & Selectors */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-3xl shadow-sm space-y-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          
          {/* Quick Status 5 Tabs with haptics */}
          <div className="glass-card p-1 rounded-2xl flex flex-wrap items-center gap-1 text-xs font-bold">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                triggerHaptic('light');
                setTabFilter('all');
              }}
              className={`px-3 py-1.5 rounded-xl transition ${
                tabFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t.tabAllTasks} ({tasks.length})
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                triggerHaptic('light');
                setTabFilter('today');
              }}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                tabFilter === 'today'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>{t.tabDueToday}</span>
              {todayCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {todayCount}
                </span>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                triggerHaptic('light');
                setTabFilter('upcoming');
              }}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                tabFilter === 'upcoming'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>{t.tabUpcoming}</span>
              {upcomingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] flex items-center justify-center font-bold">
                  {upcomingCount}
                </span>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                triggerHaptic('light');
                setTabFilter('overdue');
              }}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                tabFilter === 'overdue'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : overdueCount > 0
                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>{t.tabOverdue}</span>
              {overdueCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] flex items-center justify-center font-bold">
                  {overdueCount}
                </span>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                triggerHaptic('light');
                setTabFilter('completed');
              }}
              className={`px-3 py-1.5 rounded-xl transition ${
                tabFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t.tabCompleted} ({completedCount})
            </motion.button>
          </div>

          {/* Sub Filters */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => {
                triggerHaptic('light');
                setPriorityFilter(e.target.value as any);
              }}
              className="text-xs rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2.5 text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="High">{t.priorityHigh}</option>
              <option value="Medium">{t.priorityMedium}</option>
              <option value="Low">{t.priorityLow}</option>
            </select>

            {/* Sales Rep */}
            <select
              value={salesFilter}
              disabled={currentUser.role === 'sales'}
              onChange={(e) => {
                triggerHaptic('light');
                setSalesFilter(e.target.value);
              }}
              className="text-xs rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2.5 text-slate-700 dark:text-slate-200 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {currentUser.role !== 'sales' && <option value="all">{t.allSalesReps}</option>}
              {salesReps.map((r) => (
                <option key={r.id} value={r.id}>{r.fullName}</option>
              ))}
            </select>

          </div>

        </div>
      </div>

      {/* Task Cards with Motion & Touch Responsiveness */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 glass-panel rounded-3xl">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-600" />
            <p className="text-sm font-semibold">{t.noTasks}</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const store = storeMap.get(task.storeId);
            const promo = task.promotionId ? promoMap.get(task.promotionId) : undefined;
            const rep = userMap.get(task.assignedUser);

            const taskDueTime = new Date(task.dueDate).getTime();
            const isOverdue = taskDueTime < startOfToday && task.taskStatus !== 'Completed';
            const isToday = taskDueTime >= startOfToday && taskDueTime < endOfToday;

            return (
              <motion.div
                key={task.id}
                layout
                whileTap={{ scale: 0.985 }}
                className={`calm-card p-3.5 sm:p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  task.taskStatus === 'Completed'
                    ? 'opacity-60 bg-[var(--color-surface-secondary)]/60'
                    : isOverdue
                    ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20'
                    : isToday
                    ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20'
                    : 'border-[var(--color-border)] hover:border-emerald-500/30'
                }`}
              >
                {/* Left: Checkmark & Details */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <motion.button
                    whileTap={{ scale: 0.75 }}
                    onClick={() => handleQuickComplete(task.id)}
                    disabled={task.taskStatus === 'Completed'}
                    className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center transition shrink-0 ${
                      task.taskStatus === 'Completed'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] text-transparent hover:text-[var(--color-primary)] active:bg-emerald-50 dark:active:bg-emerald-950/40'
                    }`}
                    title="Mark Done"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </motion.button>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h4 className={`text-xs sm:text-sm font-bold leading-tight ${
                        task.taskStatus === 'Completed'
                          ? 'line-through text-slate-400'
                          : 'text-[var(--color-text-primary)]'
                      }`}>
                        {task.taskTitle}
                      </h4>

                      {/* Priority Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        task.priority === 'High'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : task.priority === 'Medium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {task.priority}
                      </span>

                      {/* Calm Overdue alert */}
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          {language === 'lo' ? 'ກາຍກຳນົດ' : 'OVERDUE'}
                        </span>
                      )}
                    </div>

                    {/* Store & Promotion Info */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {store && (
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                          <StoreIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[160px]">{store.storeName}</span>
                        </span>
                      )}

                      {promo && (
                        <span className="flex items-center gap-1 text-[11px] truncate max-w-[140px]">
                          <Tag className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">{promo.promotionName}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-[11px]">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{rep || 'Sales Rep'}</span>
                      </span>
                    </div>

                    {task.remark && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">
                        "{task.remark}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Due Date & Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-200 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <div className={`text-xs font-bold flex items-center gap-1 ${
                      isOverdue
                        ? 'text-rose-600 dark:text-rose-400 font-black'
                        : isToday
                        ? 'text-amber-600 dark:text-amber-400 font-bold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{task.dueDate ? task.dueDate.substring(0, 10) : 'No due date'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Status: {task.taskStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => openEditModal(task)}
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Edit Task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>

              </motion.div>
            );
          })
        )}
      </div>

      {/* New / Edit Task Bottom Sheet Modal */}
      <AnimatePresence>
        {(isNewTaskOpen || editingTask) && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl glass-panel p-5 sm:p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              {/* Drag bar for mobile visual */}
              <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingTask ? 'Edit Task' : t.newTask}
                </h3>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    setIsNewTaskOpen(false);
                    setEditingTask(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <form onSubmit={handleSaveTask} className="space-y-3.5 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {t.taskTitle} *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Bring promo POSM materials & check stock"
                    className="w-full text-xs rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Retail Store *
                  </label>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="w-full text-xs rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.storeCode} - {s.storeName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Linked Promotion (Optional)
                  </label>
                  <select
                    value={selectedPromoId}
                    onChange={(e) => setSelectedPromoId(e.target.value)}
                    className="w-full text-xs rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">None / General Follow-up</option>
                    {promotions.map((p) => (
                      <option key={p.id} value={p.id}>{p.promotionName}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t.dueDate} *
                    </label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full text-xs rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t.priority}
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      className="w-full text-xs rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="High">{t.priorityHigh}</option>
                      <option value="Medium">{t.priorityMedium}</option>
                      <option value="Low">{t.priorityLow}</option>
                    </select>
                  </div>
                </div>

                {editingTask && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t.taskStatus}
                    </label>
                    <select
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                      className="w-full text-xs rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {t.remark}
                  </label>
                  <textarea
                    rows={2}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Notes, reminders..."
                    className="w-full text-xs rounded-xl bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      setIsNewTaskOpen(false);
                      setEditingTask(null);
                    }}
                    className="px-4 py-2.5 rounded-2xl text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    {t.cancel}
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.94 }}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition"
                  >
                    {t.save}
                  </motion.button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Action Button (FAB) with tactile response */}
      <div className="lg:hidden fixed bottom-20 right-4 z-30 pointer-events-auto">
        <motion.button
          whileTap={{ scale: 0.86 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          onClick={openNewTaskModal}
          className="w-13 h-13 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white shadow-lg shadow-emerald-950/25 flex items-center justify-center border-2 border-white/20 active:shadow-sm"
          aria-label="Add new task"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </motion.button>
      </div>

    </div>
  );
};
