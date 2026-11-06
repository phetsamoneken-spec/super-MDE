import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Store,
  ShoppingBag,
  TrendingUp,
  Compass,
  Award,
  Upload,
  Trash2,
  RotateCcw,
  Check,
  X,
  Palette,
  Image as ImageIcon
} from 'lucide-react';
import { AppBranding, Language } from '../types';
import { dataService } from '../services/dataService';
import { BrandLogo } from './BrandLogo';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface AppBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onBrandingUpdated: (branding: AppBranding) => void;
}

const PRESET_ICONS = [
  { id: 'Sparkles', label: 'Sparkles / ດາວ', icon: Sparkles },
  { id: 'Store', label: 'Store / ຮ້ານຄ້າ', icon: Store },
  { id: 'ShoppingBag', label: 'Shopping / ຖົງຊື້', icon: ShoppingBag },
  { id: 'TrendingUp', label: 'Sales / ຍອດຂາຍ', icon: TrendingUp },
  { id: 'Compass', label: 'Compass / ເຂັມທິດ', icon: Compass },
  { id: 'Award', label: 'Award / ລາງວັນ', icon: Award }
] as const;

const PRESET_COLORS = [
  { color: '#248A60', label: 'Sage Green (Default)' },
  { color: '#059669', label: 'Emerald' },
  { color: '#2563EB', label: 'Ocean Blue' },
  { color: '#7C3AED', label: 'Royal Purple' },
  { color: '#D97706', label: 'Warm Amber' },
  { color: '#E11D48', label: 'Rose Red' }
];

export const AppBrandingModal: React.FC<AppBrandingModalProps> = ({
  isOpen,
  onClose,
  language,
  onBrandingUpdated
}) => {
  const currentBranding = dataService.getAppBranding();

  const [appName, setAppName] = useState(currentBranding.appName);
  const [tagline, setTagline] = useState(currentBranding.tagline);
  const [logoType, setLogoType] = useState<'icon' | 'custom'>(currentBranding.logoType);
  const [logoIcon, setLogoIcon] = useState(currentBranding.logoIcon);
  const [logoColor, setLogoColor] = useState(currentBranding.logoColor);
  const [customLogoUrl, setCustomLogoUrl] = useState(currentBranding.customLogoUrl || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(language === 'lo' ? 'ໄຟລ໌ຮູບພາບໃຫຍ່ເກີນໄປ (ສູງສຸດ 2MB)' : 'Image file is too large (max 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustomLogoUrl(dataUrl);
      setLogoType('custom');
      triggerHaptic('success');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) return;

    triggerHaptic('medium');
    const updated = dataService.updateAppBranding({
      appName: appName.trim(),
      tagline: tagline.trim(),
      logoType,
      logoIcon,
      logoColor,
      customLogoUrl
    });

    onBrandingUpdated(updated);
    onClose();
  };

  const handleReset = () => {
    triggerHaptic('warning');
    const def = dataService.resetAppBranding();
    setAppName(def.appName);
    setTagline(def.tagline);
    setLogoType(def.logoType);
    setLogoIcon(def.logoIcon);
    setLogoColor(def.logoColor);
    setCustomLogoUrl('');
    onBrandingUpdated(def);
  };

  // Temp branding state for live preview
  const previewBranding: AppBranding = {
    appName: appName || 'PromoTrack',
    tagline: tagline || 'Sales Promotion & Store Execution PWA',
    logoType,
    logoIcon,
    logoColor,
    customLogoUrl
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl calm-card p-5 sm:p-6 shadow-2xl border border-[var(--color-border)] max-h-[92vh] overflow-y-auto space-y-4"
      >
        {/* Mobile grab bar */}
        <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-2 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[var(--color-text-primary)]">
              {language === 'lo' ? 'ປັບແຕ່ງຊື່ແອັບ ແລະ ໂລໂກ້' : 'Customize App Name & Logo'}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {language === 'lo'
                ? 'ຕັ້ງຊື່ແອັບ ແລະ ເລືອກໂລໂກ້ໃຫ້ເໝາະກັບແບຣນ ຫຼື ທຸລະກິດຂອງທ່ານ'
                : 'Personalize the app branding, title, and logo for your business'}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onClose}
            className="p-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Live Preview Card */}
        <div className="p-3.5 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block">
            {language === 'lo' ? 'ຕົວຢ່າງການສະແດງຜົນ (Live Preview)' : 'Live Preview in Header'}
          </span>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs">
            <BrandLogo branding={previewBranding} size="md" />
            <div className="min-w-0">
              <h4 className="text-sm font-extrabold text-[var(--color-text-primary)] truncate">
                {previewBranding.appName}
              </h4>
              <p className="text-[10px] text-[var(--color-text-secondary)] truncate">
                {previewBranding.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* App Name Field */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
              {language === 'lo' ? 'ຊື່ແອັບ (App Name) *' : 'App Name *'}
            </label>
            <input
              type="text"
              required
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. BeerLao Tracker, PromoTrack"
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition"
            />
          </div>

          {/* Tagline Field */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
              {language === 'lo' ? 'ຄຳຂວັນ ຫຼື ລາຍລະອຽດແອັບ' : 'Tagline / Subtitle'}
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Sales Promotion & Store Execution PWA"
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition"
            />
          </div>

          {/* Logo Mode Switcher */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1.5">
              {language === 'lo' ? 'ຮູບແບບໂລໂກ້ (Logo Style)' : 'Logo Source'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  triggerHaptic('light');
                  setLogoType('icon');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  logoType === 'icon'
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>{language === 'lo' ? 'ເລືອກໄອຄອນ & ສີ' : 'Preset Icon & Color'}</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  triggerHaptic('light');
                  setLogoType('custom');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  logoType === 'custom'
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{language === 'lo' ? 'ອັບໂຫຼດຮູບໂລໂກ້' : 'Upload Image Logo'}</span>
              </motion.button>
            </div>
          </div>

          {/* Option A: Custom Image Upload */}
          {logoType === 'custom' && (
            <div className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />

              {customLogoUrl ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <img
                      src={customLogoUrl}
                      alt="Uploaded Logo"
                      className="w-12 h-12 object-contain rounded-lg border border-[var(--color-border)] bg-white p-1"
                    />
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                        {language === 'lo' ? 'ຮູບໂລໂກ້ຖືກອັບໂຫຼດແລ້ວ' : 'Custom Logo Uploaded'}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Active Logo</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
                    >
                      {language === 'lo' ? 'ປ່ຽນຮູບ' : 'Replace'}
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        triggerHaptic('warning');
                        setCustomLogoUrl('');
                        setLogoType('icon');
                      }}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] rounded-2xl text-center cursor-pointer bg-[var(--color-surface)] transition group"
                >
                  <Upload className="w-8 h-8 mx-auto text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] transition mb-1.5" />
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">
                    {language === 'lo' ? 'ກົດເພື່ອເລືອກໄຟລ໌ຮູບພາບໂລໂກ້' : 'Click to upload your logo image'}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                    PNG, SVG, JPG, WebP (Max 2MB)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Option B: Preset Icon & Color Picker */}
          {logoType === 'icon' && (
            <div className="space-y-3 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
              {/* Choose Icon */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] mb-1.5">
                  {language === 'lo' ? 'ເລືອກໄອຄອນ' : 'Select Icon'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = logoIcon === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          triggerHaptic('light');
                          setLogoIcon(item.id as any);
                        }}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                          isSelected
                            ? 'bg-[var(--color-surface)] border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 text-[var(--color-primary)]'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
                        }`}
                      >
                        <IconComp className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.id}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Choose Accent Color */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] mb-1.5">
                  {language === 'lo' ? 'ເລືອກສີພື້ນຫຼັງໂລໂກ້' : 'Select Logo Color'}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((item) => {
                    const isSelected = logoColor === item.color;
                    return (
                      <motion.button
                        key={item.color}
                        type="button"
                        whileTap={{ scale: 0.88 }}
                        onClick={() => {
                          triggerHaptic('light');
                          setLogoColor(item.color);
                        }}
                        style={{ backgroundColor: item.color }}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition shadow-2xs ${
                          isSelected ? 'ring-3 ring-black/30 dark:ring-white/40 scale-105' : 'opacity-90 hover:opacity-100'
                        }`}
                        title={item.label}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={handleReset}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'lo' ? 'ຄືນຄ່າເລີ່ມຕົ້ນ' : 'Reset'}</span>
            </motion.button>

            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] transition"
              >
                {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
              </motion.button>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.94 }}
                className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold shadow-xs transition"
              >
                {language === 'lo' ? 'ບັນທຶກການປ່ຽນແປງ' : 'Save Changes'}
              </motion.button>
            </div>
          </div>

        </form>

      </motion.div>
    </div>
  );
};
