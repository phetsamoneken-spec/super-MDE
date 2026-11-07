import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  AlertTriangle,
  UploadCloud,
  Image as ImageIcon,
  Tag,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { Promotion, PromotionStatus, Language } from '../types';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface EditPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion: Promotion | null;
  language: Language;
  onSaved: () => void;
  onDeleted?: (promotionId: string) => void;
}

export const EditPromotionModal: React.FC<EditPromotionModalProps> = ({
  isOpen,
  onClose,
  promotion,
  language,
  onSaved,
  onDeleted
}) => {
  const isEditing = Boolean(promotion);

  const availableSubChannels = dataService.getSubChannels().map((sc) => sc.name);

  const [formData, setFormData] = useState({
    promotionName: '',
    description: '',
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
    status: 'Active' as PromotionStatus,
    imageUrl: '',
    targetSubChannels: [] as string[]
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (promotion) {
      setFormData({
        promotionName: promotion.promotionName,
        description: promotion.description || '',
        startDate: promotion.startDate,
        endDate: promotion.endDate,
        status: promotion.status,
        imageUrl: promotion.imageUrl || '',
        targetSubChannels: promotion.targetSubChannels || []
      });
      setImagePreview(promotion.imageUrl || '');
    } else {
      setFormData({
        promotionName: '',
        description: '',
        startDate: new Date().toISOString().substring(0, 10),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
        status: 'Active',
        imageUrl: '',
        targetSubChannels: []
      });
      setImagePreview('');
    }
    setImageError('');
    setFormError('');
    setIsConfirmDeleteOpen(false);
  }, [promotion, isOpen]);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      triggerHaptic('warning');
      setImageError(
        language === 'lo'
          ? 'ປະເພດຮູບພາບບໍ່ຖືກຕ້ອງ. ກະລຸນາເລືອກ JPEG, PNG, ຫຼື WebP'
          : 'Invalid image type. Please select JPEG, PNG, or WebP.'
      );
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      triggerHaptic('warning');
      setImageError(
        language === 'lo'
          ? 'ຂະໜາດໄຟລ໌ເກີນ 5MB. ກະລຸນາເລືອກຮູບທີ່ນ້ອຍກວ່າ 5MB'
          : 'File size exceeds 5MB limit. Please upload an image under 5MB.'
      );
      return;
    }

    triggerHaptic('light');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setFormData((prev) => ({ ...prev, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.promotionName.trim()) {
      setFormError(
        language === 'lo' ? 'ກະລຸນາໃສ່ຊື່ໂປຣໂມຊັ່ນ' : 'Promotion Name is required.'
      );
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setFormError(
        language === 'lo'
          ? 'ວັນທີສິ້ນສຸດຕ້ອງຢູ່ຫຼັງ ຫຼື ເທົ່າກັບ ວັນທີເລີ່ມຕົ້ນ'
          : 'End Date must be on or after Start Date.'
      );
      return;
    }

    triggerHaptic('medium');

    if (promotion) {
      const res = dataService.updatePromotion(promotion.id, {
        promotionName: formData.promotionName.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        imageUrl: formData.imageUrl,
        targetSubChannels: formData.targetSubChannels
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to update promotion.');
        return;
      }
    } else {
      const res = dataService.createPromotion({
        promotionName: formData.promotionName.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        imageUrl: formData.imageUrl,
        targetSubChannels: formData.targetSubChannels
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to create promotion.');
        return;
      }
    }

    onSaved();
    onClose();
  };

  const handleDelete = () => {
    if (!promotion) return;
    triggerHaptic('warning');
    const res = dataService.deletePromotion(promotion.id);
    if (!res.success) {
      setFormError(res.error || 'Failed to delete promotion.');
      setIsConfirmDeleteOpen(false);
      return;
    }

    if (onDeleted) {
      onDeleted(promotion.id);
    }
    onSaved();
    setIsConfirmDeleteOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-3 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-[var(--color-primary)] flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
                {isEditing
                  ? language === 'lo' ? 'ແກ້ໄຂໂປຣໂມຊັ່ນ' : 'Edit Promotion'
                  : language === 'lo' ? 'ສ້າງໂປຣໂມຊັ່ນໃໝ່' : 'New Promotion'}
              </h3>
              <p className="text-[10px] text-[var(--color-text-secondary)]">
                {language === 'lo' ? 'ກຳນົດຊື່, ວັນທີ, ຮູບພາບ ແລະ ເງື່ອນໄຂ' : 'Name, dates, image and campaign details'}
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {formError && (
          <div className="my-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5 pt-3">
          {/* Promotion Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              {language === 'lo' ? 'ຊື່ໂປຣໂມຊັ່ນ *' : 'Promotion Name *'}
            </label>
            <input
              type="text"
              required
              value={formData.promotionName}
              onChange={(e) => setFormData({ ...formData, promotionName: e.target.value })}
              placeholder={language === 'lo' ? 'ຕົວຢ່າງ: ເບຍກຣີມ 4+1 ຫຼື ໂປຣສົງການ 2026' : 'e.g. Songkran Special Sale 2026'}
              className="w-full text-xs rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] p-2.5 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              {language === 'lo' ? 'ລາຍລະອຽດໂປຣໂມຊັ່ນ' : 'Description'}
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={language === 'lo' ? 'ເງື່ອນໄຂການແຖມ, ສ່ວນຫຼຸດ, ຈຳນວນຂັ້ນຕ່ຳ...' : 'Mechanics, discounts, bundle details...'}
              className="w-full text-xs rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] p-2.5 outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>

          {/* Dates & Status Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-[var(--color-text-secondary)] mb-1">
                {language === 'lo' ? 'ວັນທີເລີ່ມຕົ້ນ' : 'Start Date'}
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full text-[11px] rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] p-2 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--color-text-secondary)] mb-1">
                {language === 'lo' ? 'ວັນທີສິ້ນສຸດ' : 'End Date'}
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full text-[11px] rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] p-2 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--color-text-secondary)] mb-1">
                {language === 'lo' ? 'ສະຖານະ' : 'Status'}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PromotionStatus })}
                className="w-full text-[11px] rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] p-2 outline-none font-semibold"
              >
                <option value="Active">{language === 'lo' ? 'ເປີດໃຊ້ (Active)' : 'Active'}</option>
                <option value="Draft">{language === 'lo' ? 'ສະບັບຮ່າງ (Draft)' : 'Draft'}</option>
                <option value="Completed">{language === 'lo' ? 'ສິ້ນສຸດ (Completed)' : 'Completed'}</option>
              </select>
            </div>
          </div>

          {/* Target Sub-Channels (Multi-Select) */}
          <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[var(--color-text-primary)] block">
                  {language === 'lo'
                    ? 'ເລືອກ Sub-Channel ທີ່ເຂົ້າຮ່ວມ (ເລືອກໄດ້ຫຼາຍຊ່ອງທາງ):'
                    : 'Target Sub-Channels (Multi-Select):'}
                </label>
                <span className="text-[10px] text-[var(--color-text-secondary)]">
                  {formData.targetSubChannels.length === 0
                    ? (language === 'lo' ? 'ກົດເລືອກ Sub-Channel ເພື່ອກຳນົດຮ້ານເຂົ້າຮ່ວມ' : 'Tap to select participating store channels')
                    : (language === 'lo'
                      ? `ເລືອກແລ້ວ ${formData.targetSubChannels.length} Sub-Channel`
                      : `${formData.targetSubChannels.length} Sub-Channels selected`)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setFormData((prev) => ({ ...prev, targetSubChannels: availableSubChannels }));
                  }}
                  className="text-[10px] font-bold text-[var(--color-primary)] hover:underline"
                >
                  {language === 'lo' ? 'ເລືອກທັງໝົດ' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setFormData((prev) => ({ ...prev, targetSubChannels: [] }));
                  }}
                  className="text-[10px] font-bold text-[var(--color-text-secondary)] hover:underline"
                >
                  {language === 'lo' ? 'ລ້າງອອກ' : 'Clear'}
                </button>
              </div>
            </div>

            {/* Multi-Select Pills */}
            <div className="flex flex-wrap gap-1.5 p-2 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
              {availableSubChannels.map((subCh) => {
                const isSelected = formData.targetSubChannels.includes(subCh);
                return (
                  <motion.button
                    key={subCh}
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      triggerHaptic('light');
                      setFormData((prev) => {
                        const current = prev.targetSubChannels;
                        const next = current.includes(subCh)
                          ? current.filter((c) => c !== subCh)
                          : [...current, subCh];
                        return { ...prev, targetSubChannels: next };
                      });
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-2xs'
                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[var(--color-text-secondary)] opacity-40'}`}
                    />
                    <span>{subCh}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Image Upload and Preview */}
          <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
              {language === 'lo' ? 'ຮູບພາບໂປຣໂມຊັ່ນ (Banner Image)' : 'Promotion Banner Image'}
            </label>

            {/* Preview */}
            {(imagePreview || formData.imageUrl) && (
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-[var(--color-border)]">
                <img
                  src={imagePreview || formData.imageUrl}
                  alt="Promotion preview"
                  className="w-full h-auto max-h-80 object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview('');
                    setFormData((prev) => ({ ...prev, imageUrl: '' }));
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* File upload input */}
              <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 hover:bg-[var(--color-surface-secondary)] cursor-pointer text-xs font-medium text-[var(--color-text-secondary)] transition">
                <UploadCloud className="w-4 h-4 text-[var(--color-primary)]" />
                <span>{language === 'lo' ? 'ອັບໂຫຼດຮູບ (ສູງສຸດ 5MB)' : 'Upload file (Max 5MB)'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>

              {/* Or image URL input */}
              <div className="flex items-center gap-1">
                <input
                  type="url"
                  value={formData.imageUrl.startsWith('data:') ? '' : formData.imageUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setFormData((prev) => ({ ...prev, imageUrl: url }));
                    setImagePreview(url);
                  }}
                  placeholder={language === 'lo' ? 'ຫຼື ວາງ URL ຮູບພາບ...' : 'Or paste image URL...'}
                  className="w-full text-xs rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] p-2 outline-none"
                />
              </div>
            </div>

            {imageError && (
              <p className="text-[10px] text-rose-500 font-medium">{imageError}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--color-border)]">
            {isEditing ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="py-2.5 px-3.5 rounded-2xl text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-600 hover:text-white transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'lo' ? 'ລົບໂປຣໂມຊັ່ນ' : 'Delete'}</span>
              </motion.button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-2xl text-xs font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
              >
                {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-2xl text-xs font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white shadow-sm transition"
              >
                {language === 'lo' ? 'ບັນທຶກ' : 'Save Promotion'}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {isConfirmDeleteOpen && promotion && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h4 className="text-base font-extrabold text-[var(--color-text-primary)]">
                  {language === 'lo' ? 'ຢືນຢັນການລົບໂປຣໂມຊັ່ນ?' : 'Delete Promotion?'}
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {language === 'lo'
                    ? `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບໂປຣໂມຊັ່ນ "${promotion.promotionName}"? ຂໍ້ມູນການຕິດຕາມຮ້ານຄ້າຈະຖືກລຶບອອກນຳ.`
                    : `Are you sure you want to delete "${promotion.promotionName}"? Associated store tracking records will also be removed.`}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
                >
                  {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition"
                >
                  {language === 'lo' ? 'ລົບທັນທີ' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </motion.div>
    </div>
  );
};
