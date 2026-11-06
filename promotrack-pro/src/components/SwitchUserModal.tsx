import React from 'react';
import { UserCheck, Shield, User, X, CheckCircle } from 'lucide-react';
import { UserProfile, Language } from '../types';
import { translations } from '../i18n/translations';
import { dataService } from '../services/dataService';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  language: Language;
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  language
}) => {
  const t = translations[language];
  const allUsers = dataService.getAllUsers();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl glass-panel p-5 sm:p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
      >
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t.switchAccount}
            </h3>
          </div>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        <p className="text-xs text-slate-500 my-3">
          {language === 'lo'
            ? 'ເລືອກບັນຊີເພື່ອທົດສອບສິດທິ (Admin ເບິ່ງໄດ້ທຸກຮ້ານ, Sales ເບິ່ງໄດ້ສະເພາະຮ້ານທີ່ຖືກມອບໝາຍ):'
            : 'Switch persona to test role-based row level security (Admin views all stores; Sales Reps view only assigned stores):'}
        </p>

        {/* User Persona List */}
        <div className="space-y-2">
          {allUsers.map((user) => {
            const isSelected = user.id === currentUser.id;
            return (
              <motion.div
                key={user.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  triggerHaptic('medium');
                  onSelectUser(user);
                  onClose();
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/20"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{user.fullName}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Sales Rep'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {user.email} • {user.phone}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="pt-4 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
          >
            {t.cancel}
          </motion.button>
        </div>

      </motion.div>
    </div>
  );
};
