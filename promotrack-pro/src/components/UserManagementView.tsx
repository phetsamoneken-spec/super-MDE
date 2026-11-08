import { avatarFor } from '../utils/avatar';
import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Store,
  Upload,
  Check,
  X,
  AlertTriangle,
  Lock,
  ArrowLeft,
  UserCheck
} from 'lucide-react';
import { UserProfile, Language, Store as StoreType } from '../types';
import { translations } from '../i18n/translations';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface UserManagementViewProps {
  currentUser: UserProfile;
  language: Language;
  stores: StoreType[];
  onRefreshData: () => void;
  onNavigateTab: (tab: 'dashboard' | 'stores' | 'tasks' | 'promotions' | 'tracking' | 'excel' | 'more') => void;
  onOpenSwitchUser: () => void;
}

const PRESET_AVATARS = [avatarFor()];

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  language,
  stores,
  onRefreshData,
  onNavigateTab,
  onOpenSwitchUser
}) => {
  const t = translations[language];

  // Restrict access: Only Admin can access
  const isAdmin = currentUser.role === 'admin';

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'sales'>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'sales' as 'admin' | 'sales',
    avatarUrl: PRESET_AVATARS[0]
  });
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allUsers = dataService.getAllUsers();

  // Count stores assigned per user
  const storeCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    stores.forEach((s) => {
      map.set(s.assignedSalesUser, (map.get(s.assignedSalesUser) || 0) + 1);
    });
    return map;
  }, [stores]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = u.fullName.toLowerCase().includes(query);
        const matchesEmail = u.email.toLowerCase().includes(query);
        const matchesPhone = (u.phone || '').toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesPhone) return false;
      }
      return true;
    });
  }, [allUsers, roleFilter, searchTerm]);

  // If user is not Admin, display Access Denied Screen
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto"
        >
          <Lock className="w-8 h-8" />
        </motion.div>

        <h3 className="text-lg font-black text-[var(--color-text-primary)]">
          {language === 'lo' ? 'ສະເພາະຜູ້ບໍລິຫານລະບົບ (Admin Only)' : 'Administrator Access Only'}
        </h3>

        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {language === 'lo'
            ? 'ລະບົບຈັດການຜູ້ໃຊ້ງານສາມາດເຂົ້າເຖິງໄດ້ສະເພາະບັນຊີທີ່ມີສິດທິ Admin ເທົ່ານັ້ນ. ບັນຊີປັດຈຸບັນຂອງທ່ານແມ່ນ ພະນັກງານຂາຍ (Sales Rep).'
            : 'The user management system is restricted to users with the Administrator role. Your current account has Sales Representative permissions.'}
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => onNavigateTab('dashboard')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition"
          >
            {language === 'lo' ? 'ກັບຄືນໜ້າຫຼັກ' : 'Return to Dashboard'}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onOpenSwitchUser}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-[var(--color-primary)] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" />
            <span>{language === 'lo' ? 'ປ່ຽນບັນຊີເປັນ Admin' : 'Switch to Admin Persona'}</span>
          </motion.button>
        </div>
      </div>
    );
  }

  const openAddModal = () => {
    triggerHaptic('medium');
    setFormData({
      fullName: '',
      email: '',
      phone: '+856 20 ',
      role: 'sales',
      avatarUrl: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)]
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: UserProfile) => {
    triggerHaptic('light');
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      avatarUrl: user.avatarUrl || PRESET_AVATARS[0]
    });
    setFormError('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(language === 'lo' ? 'ໄຟລ໌ຮູບພາບໃຫຍ່ເກີນໄປ (ສູງສຸດ 2MB)' : 'Photo file is too large (max 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({ ...prev, avatarUrl: dataUrl }));
      triggerHaptic('success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }

    triggerHaptic('medium');

    if (editingUser) {
      const res = dataService.updateUser(editingUser.id, {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        avatarUrl: formData.avatarUrl
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update user.');
        return;
      }
      setEditingUser(null);
    } else {
      const res = dataService.addUser({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        avatarUrl: formData.avatarUrl
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to add user.');
        return;
      }
      setIsAddModalOpen(false);
    }

    onRefreshData();
  };

  const handleDeleteUser = () => {
    if (!deletingUser) return;
    triggerHaptic('warning');
    const res = dataService.deleteUser(deletingUser.id);
    if (!res.success) {
      alert(res.error);
    } else {
      setDeletingUser(null);
      onRefreshData();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
              {language === 'lo' ? 'ລະບົບຈັດການຜູ້ໃຊ້ງານ' : 'User Management'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            {language === 'lo'
              ? 'ຈັດການບັນຊີຜູ້ໃຊ້, ບົດບາດ Admin / ພະນັກງານຂາຍ ແລະ ຮູບໂປຣໄຟລ໌'
              : 'Create, modify, and delete admin or sales representative accounts'}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>{language === 'lo' ? 'ເພີ່ມຜູ້ໃຊ້ໃໝ່' : 'Add New User'}</span>
        </motion.button>
      </div>

      {/* KPI Stats summary */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="calm-card p-3 rounded-2xl text-center">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
            {language === 'lo' ? 'ຜູ້ໃຊ້ທັງໝົດ' : 'Total Users'}
          </span>
          <span className="text-lg font-black text-[var(--color-text-primary)] mt-0.5 block">
            {allUsers.length}
          </span>
        </div>

        <div className="calm-card p-3 rounded-2xl text-center">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
            {language === 'lo' ? 'ຜູ້ບໍລິຫານ (Admin)' : 'Admins'}
          </span>
          <span className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5 block">
            {allUsers.filter((u) => u.role === 'admin').length}
          </span>
        </div>

        <div className="calm-card p-3 rounded-2xl text-center">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] block">
            {language === 'lo' ? 'ພະນັກງານຂາຍ' : 'Sales Reps'}
          </span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {allUsers.filter((u) => u.role === 'sales').length}
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="calm-card p-3 sm:p-4 rounded-3xl space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'lo' ? 'ຄົ້ນຫາຊື່, ອີເມວ ຫຼື ເບີໂທ...' : 'Search by name, email, or phone...'}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[var(--color-surface-secondary)] p-1 rounded-2xl">
            {(['all', 'admin', 'sales'] as const).map((r) => (
              <motion.button
                key={r}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  triggerHaptic('light');
                  setRoleFilter(r);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize ${
                  roleFilter === r
                    ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {r === 'all'
                  ? language === 'lo' ? 'ທຸກບົດບາດ' : 'All Roles'
                  : r === 'admin'
                  ? 'Admin'
                  : 'Sales Rep'}
              </motion.button>
            ))}
          </div>

        </div>
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredUsers.map((user) => {
          const isCurrentSessionUser = user.id === currentUser.id;
          const assignedStores = storeCountsMap.get(user.id) || 0;

          return (
            <motion.div
              key={user.id}
              layout
              whileTap={{ scale: 0.985 }}
              className={`calm-card p-4 rounded-3xl border transition space-y-3 ${
                isCurrentSessionUser
                  ? 'ring-2 ring-[var(--color-primary)]/40 bg-[var(--color-surface-secondary)]/30'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={avatarFor(user)}
                    alt={user.fullName}
                    className="w-12 h-12 rounded-2xl profile-photo object-contain ring-2 ring-[var(--color-border)] shrink-0 bg-white"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] truncate">
                        {user.fullName}
                      </h4>
                      {isCurrentSessionUser && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500 text-white shrink-0">
                          YOU
                        </span>
                      )}
                    </div>

                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {user.role === 'admin' ? 'Administrator' : 'Sales Representative'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact info & assigned stores */}
              <div className="space-y-1.5 text-xs text-[var(--color-text-secondary)] pt-1 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>

                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--color-text-primary)]">
                  <Store className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                  <span>
                    {assignedStores} {language === 'lo' ? 'ຮ້ານຄ້າທີ່ຮັບຜິດຊອບ' : 'Assigned Stores'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[var(--color-border)]">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => openEditModal(user)}
                  className="px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{language === 'lo' ? 'ແກ້ໄຂ' : 'Edit'}</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.88 }}
                  disabled={isCurrentSessionUser}
                  onClick={() => {
                    if (isCurrentSessionUser) return;
                    triggerHaptic('warning');
                    setDeletingUser(user);
                  }}
                  title={isCurrentSessionUser ? 'Cannot delete active logged-in user' : 'Delete User'}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                    isCurrentSessionUser
                      ? 'opacity-40 cursor-not-allowed border-[var(--color-border)] text-slate-400'
                      : 'border-rose-500/30 text-rose-600 bg-rose-500/5 hover:bg-rose-500/10'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'lo' ? 'ລຶບ' : 'Delete'}</span>
                </motion.button>
              </div>

            </motion.div>
          );
        })}
      </div>

      {/* Add / Edit User Modal */}
      <AnimatePresence>
        {(isAddModalOpen || editingUser) && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl calm-card p-5 sm:p-6 shadow-2xl border border-[var(--color-border)] max-h-[92vh] overflow-y-auto space-y-4"
            >
              <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-2 sm:hidden" />

              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  {editingUser
                    ? (language === 'lo' ? 'ແກ້ໄຂຂໍ້ມູນຜູ້ໃຊ້' : 'Edit User Profile')
                    : (language === 'lo' ? 'ເພີ່ມຜູ້ໃຊ້ງານໃໝ່' : 'Add New User')}
                </h3>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveUser} className="space-y-3.5">
                
                {/* Photo / Avatar Section */}
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1.5">
                    {language === 'lo' ? 'ຮູບໂປຣໄຟລ໌ / Avatar *' : 'Profile Photo / Avatar'}
                  </label>

                  <div className="flex items-center gap-3 mb-2.5">
                    <img
                      src={avatarFor(formData)}
                      alt="Avatar Preview"
                      className="w-14 h-14 rounded-2xl profile-photo object-contain ring-2 ring-[var(--color-primary)] bg-white shrink-0"
                    />

                    <div className="space-y-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        <span>{language === 'lo' ? 'ອັບໂຫຼດຮູບຈາກເຄື່ອງ' : 'Upload Custom Photo'}</span>
                      </motion.button>
                      <span className="text-[10px] text-[var(--color-text-secondary)] block">
                        PNG, JPG, WebP (Max 2MB)
                      </span>
                    </div>
                  </div>

                  {/* Preset Avatars Row */}
                  <span className="text-[11px] font-bold text-[var(--color-text-secondary)] block mb-1">
                    {language === 'lo' ? 'ຫຼື ເລືອກຮູບຕົວແທນ:' : 'Or choose preset avatar:'}
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {PRESET_AVATARS.map((url, idx) => {
                      const isSelected = formData.avatarUrl === url;
                      return (
                        <motion.button
                          key={idx}
                          type="button"
                          whileTap={{ scale: 0.88 }}
                          onClick={() => {
                            triggerHaptic('light');
                            setFormData({ ...formData, avatarUrl: url });
                          }}
                          className={`relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                            isSelected
                              ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
                              : 'border-transparent opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt={`Preset ${idx}`} className="w-full h-full profile-photo object-contain" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    {language === 'lo' ? 'ຊື່ ແລະ ນາມສະກຸນ *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Somphone Vongxay"
                    className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    {language === 'lo' ? 'ອີເມວ (ຖ້າມີ)' : 'Email Address (optional)'}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="somphone@promotrack.la"
                    className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    {language === 'lo' ? 'ເບີໂທລະສັບ' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+856 20 ..."
                    className="w-full text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    {language === 'lo' ? 'ສິດທິ / ບົດບາດ (Role) *' : 'Role & Permissions *'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setFormData({ ...formData, role: 'sales' })}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                        formData.role === 'sales'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {language === 'lo' ? 'ພະນັກງານຂາຍ (Sales Rep)' : 'Sales Representative'}
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setFormData({ ...formData, role: 'admin' })}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                        formData.role === 'admin'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {language === 'lo' ? 'ຜູ້ບໍລິຫານ (Admin)' : 'Administrator'}
                    </motion.button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingUser(null);
                    }}
                    className="px-4 py-2.5 rounded-2xl text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] transition"
                  >
                    {t.cancel}
                  </motion.button>

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.94 }}
                    className="px-5 py-2.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold shadow-xs transition"
                  >
                    {language === 'lo' ? 'ບັນທຶກຂໍ້ມູນຜູ້ໃຊ້' : 'Save User'}
                  </motion.button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl calm-card p-6 shadow-2xl border border-rose-500/30"
            >
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 mx-auto mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <h3 className="text-sm font-bold text-[var(--color-text-primary)] text-center">
                {language === 'lo' ? 'ຢືນຢັນການລຶບຜູ້ໃຊ້ງານ' : 'Delete User Account'}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] text-center mt-1">
                {language === 'lo' ? 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບບັນຊີ' : 'Are you sure you want to delete'}{' '}
                <strong className="text-[var(--color-text-primary)]">{deletingUser.fullName}</strong> ({deletingUser.email})?
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl mt-3 text-center leading-relaxed">
                {language === 'lo'
                  ? 'ຮ້ານຄ້າທີ່ພະນັກງານຄົນນີ້ຮັບຜິດຊອບຈະຖືກໂອນໃຫ້ Admin ອັດຕະໂນມັດ.'
                  : 'Any retail stores assigned to this user will be safely reassigned to the Admin.'}
              </p>

              <div className="flex items-center gap-2 mt-5">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 py-2.5 rounded-2xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition"
                >
                  {t.cancel}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={handleDeleteUser}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition"
                >
                  {language === 'lo' ? 'ຢືນຢັນລຶບ' : 'Confirm Delete'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



    </div>
  );
};
