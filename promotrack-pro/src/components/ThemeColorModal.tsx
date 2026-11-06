import React, { useState } from 'react';
import {
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  X,
  Eye
} from 'lucide-react';
import { Language } from '../types';
import { dataService } from '../services/dataService';
import { THEME_COLOR_PRESETS, applyThemeColor, ThemeColorPreset } from '../utils/themeColors';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface ThemeColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  isDark: boolean;
  onThemeColorChanged: (colorId: string) => void;
}

export const ThemeColorModal: React.FC<ThemeColorModalProps> = ({
  isOpen,
  onClose,
  language,
  isDark,
  onThemeColorChanged
}) => {
  const [selectedColorId, setSelectedColorId] = useState<string>(() => dataService.getThemeColor());

  if (!isOpen) return null;

  const handleSelectColor = (preset: ThemeColorPreset) => {
    triggerHaptic('medium');
    setSelectedColorId(preset.id);
    dataService.setThemeColor(preset.id);
    applyThemeColor(preset.id, isDark);
    onThemeColorChanged(preset.id);
  };

  const handleReset = () => {
    triggerHaptic('warning');
    const defaultId = 'sage';
    setSelectedColorId(defaultId);
    dataService.setThemeColor(defaultId);
    applyThemeColor(defaultId, isDark);
    onThemeColorChanged(defaultId);
  };

  const currentPreset = THEME_COLOR_PRESETS.find((p) => p.id === selectedColorId) || THEME_COLOR_PRESETS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl calm-card p-5 sm:p-6 shadow-2xl border border-[var(--color-border)] max-h-[90vh] overflow-y-auto space-y-4"
      >
        {/* Mobile grab handle */}
        <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-2 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: currentPreset.primary }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
            >
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--color-text-primary)] leading-tight">
                {language === 'lo' ? 'ປັບແຕ່ງສີແອັບ (Theme Color)' : 'Customize App Theme Color'}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {language === 'lo' ? 'ເລືອກສີໂທນຫຼັກຂອງລະບົບ' : 'Select your primary accent color palette'}
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onClose}
            className="p-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Live Color Card Preview */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-text-secondary)]">
            <span>{language === 'lo' ? 'ສີທີ່ກຳລັງໃຊ້:' : 'Active Theme:'}</span>
            <span style={{ color: currentPreset.primary }} className="font-extrabold">
              {language === 'lo' ? currentPreset.nameLao : currentPreset.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: currentPreset.primary }}
              className="flex-1 py-2 px-3 rounded-xl text-white text-xs font-bold text-center shadow-xs"
            >
              Primary Button
            </div>
            <div
              style={{
                backgroundColor: currentPreset.surfaceSecondary,
                color: currentPreset.primary,
                borderColor: currentPreset.primary
              }}
              className="flex-1 py-2 px-3 rounded-xl border text-xs font-bold text-center"
            >
              Active Pill
            </div>
          </div>
        </div>

        {/* Color Presets Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[var(--color-text-primary)]">
            {language === 'lo' ? 'ເລືອກໂທນສີທີ່ຕ້ອງການ:' : 'Choose a Theme Color:'}
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            {THEME_COLOR_PRESETS.map((preset) => {
              const isSelected = selectedColorId === preset.id;
              return (
                <motion.button
                  key={preset.id}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleSelectColor(preset)}
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                    isSelected
                      ? 'bg-[var(--color-surface)] border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-xs'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]'
                  }`}
                >
                  <div
                    style={{ backgroundColor: preset.primary }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs text-white"
                  >
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                      {language === 'lo' ? preset.nameLao : preset.name}
                    </p>
                    <span className="text-[10px] text-[var(--color-text-secondary)] font-mono block">
                      {preset.primary}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'lo' ? 'ຄືນຄ່າເລີ່ມຕົ້ນ (Sage)' : 'Reset Default'}</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold shadow-xs transition"
          >
            {language === 'lo' ? 'ສຳເລັດ' : 'Done'}
          </motion.button>
        </div>

      </motion.div>
    </div>
  );
};
