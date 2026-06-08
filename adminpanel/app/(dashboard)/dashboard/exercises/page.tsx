'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import type { Exercise, ExerciseTranslation, MuscleGroup, EquipmentType } from '@/app/actions/types';
import { MobileDrawerSelect } from '@/components/ui/mobile-drawer-select';

type ModalType = 'create' | 'edit' | 'view' | 'delete' | null;

interface ExerciseFormData {
  name_en: string;
  slug: string;
  description: string;
  muscle_group_id: string;
  secondary_muscle_groups: string[];
  equipment_type_id: string;
  exercise_type: string;
  movement_pattern: string;
  is_compound: boolean;
  difficulty: string;
  image_url: string;
  video_url: string;
  is_active: boolean;
  sort_order: number;
  // Translation fields
  fa_name: string;
  fa_description: string;
  fa_instructions: string;
}

const EXERCISE_TYPES = ['strength', 'cardio', 'stretching', 'calisthenics'];
const MOVEMENT_PATTERNS = [
  'horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull',
  'squat', 'hinge', 'lunge', 'rotation', 'flexion', 'extension',
  'isolation', 'compound', 'other',
];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const inputClass = (hasError?: boolean | string) =>
  `w-full px-4 py-2.5 rounded-lg border ${hasError ? 'border-red-500' : 'border-white/10'} bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all`;

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [muscleGroupFilter, setMuscleGroupFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState('');

  // Modal
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [formData, setFormData] = useState<ExerciseFormData>({
    name_en: '', slug: '', description: '', muscle_group_id: '',
    secondary_muscle_groups: [], equipment_type_id: '', exercise_type: 'strength',
    movement_pattern: '', is_compound: false, difficulty: 'intermediate',
    image_url: '', video_url: '', is_active: true, sort_order: 0,
    fa_name: '', fa_description: '', fa_instructions: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadMuscleGroups();
    loadEquipmentTypes();
  }, []);

  useEffect(() => {
    loadExercises();
  }, [page, search, muscleGroupFilter, equipmentFilter, exerciseTypeFilter]);

  const loadExercises = () => {
    setLoading(true);
    startTransition(async () => {
      const { getAllExercises } = await import('@/app/actions/exercises');
      const result = await getAllExercises({
        page,
        pageSize,
        search: search || undefined,
        muscleGroupId: muscleGroupFilter || undefined,
        equipmentTypeId: equipmentFilter || undefined,
        exerciseType: exerciseTypeFilter || undefined,
      });
      if (result.success && result.data) {
        setExercises(result.data.data);
        setTotal(result.data.total);
      }
      setLoading(false);
    });
  };

  const loadMuscleGroups = () => {
    startTransition(async () => {
      const { getMuscleGroups } = await import('@/app/actions/exercises');
      const result = await getMuscleGroups();
      if (result.success && result.data) setMuscleGroups(result.data);
    });
  };

  const loadEquipmentTypes = () => {
    startTransition(async () => {
      const { getEquipmentTypes } = await import('@/app/actions/exercises');
      const result = await getEquipmentTypes();
      if (result.success && result.data) setEquipmentTypes(result.data);
    });
  };

  const openModal = (type: ModalType, exercise?: Exercise) => {
    setModalType(type);
    setSelectedExercise(exercise || null);
    setFormErrors({});
    if (exercise && type !== 'delete') {
      const translations = (exercise as any).exercise_translations || [];
      const faTrans = translations.find((t: any) => t.locale === 'fa');
      setFormData({
        name_en: exercise.name_en,
        slug: exercise.slug,
        description: exercise.description || '',
        muscle_group_id: exercise.muscle_group_id,
        secondary_muscle_groups: exercise.secondary_muscle_groups || [],
        equipment_type_id: exercise.equipment_type_id || '',
        exercise_type: exercise.exercise_type,
        movement_pattern: exercise.movement_pattern || '',
        is_compound: exercise.is_compound,
        difficulty: exercise.difficulty,
        image_url: exercise.image_url || '',
        video_url: exercise.video_url || '',
        is_active: exercise.is_active,
        sort_order: exercise.sort_order,
        fa_name: faTrans?.name || '',
        fa_description: faTrans?.description || '',
        fa_instructions: faTrans?.instructions || '',
      });
    } else if (type === 'create') {
      setFormData({
        name_en: '', slug: '', description: '', muscle_group_id: '',
        secondary_muscle_groups: [], equipment_type_id: '', exercise_type: 'strength',
        movement_pattern: '', is_compound: false, difficulty: 'intermediate',
        image_url: '', video_url: '', is_active: true, sort_order: 0,
        fa_name: '', fa_description: '', fa_instructions: '',
      });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedExercise(null);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name_en.trim()) errors.name_en = 'نام انگلیسی الزامی است';
    if (!formData.slug.trim()) errors.slug = 'اسلاگ الزامی است';
    if (!formData.muscle_group_id) errors.muscle_group_id = 'گروه عضلانی الزامی است';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    startTransition(async () => {
      const { createExercise, createExerciseTranslation } = await import('@/app/actions/exercises');
      const result = await createExercise({
        name_en: formData.name_en,
        slug: formData.slug,
        description: formData.description || undefined,
        muscle_group_id: formData.muscle_group_id,
        secondary_muscle_groups: formData.secondary_muscle_groups,
        equipment_type_id: formData.equipment_type_id || undefined,
        exercise_type: formData.exercise_type,
        movement_pattern: formData.movement_pattern || undefined,
        is_compound: formData.is_compound,
        difficulty: formData.difficulty,
        image_url: formData.image_url || undefined,
        video_url: formData.video_url || undefined,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      });
      if (result.success && result.data && formData.fa_name.trim()) {
        await createExerciseTranslation({
          exercise_id: result.data.id,
          locale: 'fa',
          name: formData.fa_name,
          description: formData.fa_description || undefined,
          instructions: formData.fa_instructions || undefined,
        });
      }
      closeModal();
      loadExercises();
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !selectedExercise) return;
    startTransition(async () => {
      const { updateExercise, createExerciseTranslation, updateExerciseTranslation } = await import('@/app/actions/exercises');
      await updateExercise(selectedExercise.id, {
        name_en: formData.name_en,
        slug: formData.slug,
        description: formData.description || null,
        muscle_group_id: formData.muscle_group_id,
        secondary_muscle_groups: formData.secondary_muscle_groups,
        equipment_type_id: formData.equipment_type_id || null,
        exercise_type: formData.exercise_type,
        movement_pattern: formData.movement_pattern || null,
        is_compound: formData.is_compound,
        difficulty: formData.difficulty,
        image_url: formData.image_url || null,
        video_url: formData.video_url || null,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      });
      // Handle translation
      const translations = (selectedExercise as any).exercise_translations || [];
      const faTrans = translations.find((t: any) => t.locale === 'fa');
      if (formData.fa_name.trim()) {
        if (faTrans) {
          await updateExerciseTranslation(faTrans.id, {
            name: formData.fa_name,
            description: formData.fa_description || null,
            instructions: formData.fa_instructions || null,
          });
        } else {
          await createExerciseTranslation({
            exercise_id: selectedExercise.id,
            locale: 'fa',
            name: formData.fa_name,
            description: formData.fa_description || undefined,
            instructions: formData.fa_instructions || undefined,
          });
        }
      }
      closeModal();
      loadExercises();
    });
  };

  const handleDelete = async () => {
    if (!selectedExercise) return;
    startTransition(async () => {
      const { deleteExercise } = await import('@/app/actions/exercises');
      await deleteExercise(selectedExercise.id);
      closeModal();
      loadExercises();
    });
  };

  const getMuscleGroupName = (id: string) => muscleGroups.find(m => m.id === id)?.name_en || id;
  const getEquipmentName = (id: string | null) => id ? (equipmentTypes.find(e => e.id === id)?.name_en || id) : '—';

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">مدیریت تمرینات</h1>
          <div className="flex items-center gap-3">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const csvText = ev.target?.result as string;
                  startTransition(async () => {
                    const { importExercisesFromCsv } = await import('@/app/actions/exercises');
                    const result = await importExercisesFromCsv(csvText);
                    if (result.success && result.data) {
                      const d = result.data;
                      setImportStatus({
                        success: true,
                        message: `✅ ${d.inserted} تمرین وارد شد | ${d.translationsCreated} ترجمه فارسی | ${d.skipped} تکراری رد شد`,
                      });
                      loadExercises();
                    } else {
                      setImportStatus({ success: false, message: `❌ ${result.error || 'خطا در ورود اطلاعات'}` });
                    }
                  });
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => csvInputRef.current?.click()}
              disabled={isPending}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? 'در حال ورود...' : '📥 ورود از CSV'}
            </button>
            <button
              onClick={() => openModal('create')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              + ایجاد تمرین
            </button>
          </div>
        </div>

        {/* Import Status Banner */}
        {importStatus && (
          <div className={`mb-6 px-4 py-3 rounded-lg border ${importStatus.success ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm">{importStatus.message}</span>
              <button onClick={() => setImportStatus(null)} className="text-gray-400 hover:text-white ml-4">✕</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="جستجو..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-64"
          />
<MobileDrawerSelect
            value={muscleGroupFilter}
            onChange={(v) => { setMuscleGroupFilter(v); setPage(1); }}
            placeholder="همه گروه‌های عضلانی"
            options={[{ value: '', label: 'همه گروه‌های عضلانی' }, ...muscleGroups.map((mg: any) => ({ value: mg.id, label: mg.name }))]}
            dir="rtl"
          />
<MobileDrawerSelect
            value={equipmentFilter}
            onChange={(v) => { setEquipmentFilter(v); setPage(1); }}
            placeholder="همه تجهیزات"
            options={[{ value: '', label: 'همه تجهیزات' }, ...equipmentTypes.map((eq: any) => ({ value: eq.id, label: eq.name }))]}
            dir="rtl"
          />
<MobileDrawerSelect
            value={exerciseTypeFilter}
            onChange={(v) => { setExerciseTypeFilter(v); setPage(1); }}
            placeholder="همه انواع"
            options={[
              { value: '', label: 'همه انواع' },
              { value: 'compound', label: 'ترکیبی' },
              { value: 'isolation', label: 'مجزا' },
              { value: 'cardio', label: 'کاردیو' },
            ]}
            dir="rtl"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">نام</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">اسلاگ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">گروه عضلانی</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">تجهیزات</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">نوع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">سطح</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">فعال</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">در حال بارگذاری...</td></tr>
              ) : exercises.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">تمرینی یافت نشد</td></tr>
              ) : (
                exercises.map((ex) => (
                  <tr key={ex.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white">{ex.name_en}</td>
                    <td className="px-4 py-3 text-gray-400">{ex.slug}</td>
                    <td className="px-4 py-3 text-gray-300">{getMuscleGroupName(ex.muscle_group_id)}</td>
                    <td className="px-4 py-3 text-gray-300">{getEquipmentName(ex.equipment_type_id)}</td>
                    <td className="px-4 py-3 text-gray-300">{ex.exercise_type}</td>
                    <td className="px-4 py-3 text-gray-300">{ex.difficulty}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${ex.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {ex.is_active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openModal('view', ex)} className="text-blue-400 hover:text-blue-300 text-sm">مشاهده</button>
                        <button onClick={() => openModal('edit', ex)} className="text-yellow-400 hover:text-yellow-300 text-sm">ویرایش</button>
                        <button onClick={() => openModal('delete', ex)} className="text-red-400 hover:text-red-300 text-sm">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 text-white disabled:opacity-50"
            >
              قبلی
            </button>
            <span className="text-gray-400">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 text-white disabled:opacity-50"
            >
              بعدی
            </button>
          </div>
        )}

        {/* ── View Modal ── */}
        {modalType === 'view' && selectedExercise && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeModal}>
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-white mb-4">جزئیات تمرین</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">نام انگلیسی:</span><span className="text-white">{selectedExercise.name_en}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">اسلاگ:</span><span className="text-white">{selectedExercise.slug}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">گروه عضلانی:</span><span className="text-white">{getMuscleGroupName(selectedExercise.muscle_group_id)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">تجهیزات:</span><span className="text-white">{getEquipmentName(selectedExercise.equipment_type_id)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">نوع:</span><span className="text-white">{selectedExercise.exercise_type}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">الگوی حرکت:</span><span className="text-white">{selectedExercise.movement_pattern || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">ترکیبی:</span><span className="text-white">{selectedExercise.is_compound ? 'بله' : 'خیر'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">سطح:</span><span className="text-white">{selectedExercise.difficulty}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">فعال:</span><span className="text-white">{selectedExercise.is_active ? 'بله' : 'خیر'}</span></div>
                {selectedExercise.description && <div><span className="text-gray-400">توضیحات:</span><p className="text-white mt-1">{selectedExercise.description}</p></div>}
                {/* Translations */}
                {((selectedExercise as any).exercise_translations || []).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-2">ترجمه‌ها</h3>
                    {((selectedExercise as any).exercise_translations || []).map((t: any) => (
                      <div key={t.id} className="bg-white/5 rounded-lg p-3 mb-2">
                        <div className="flex justify-between mb-1"><span className="text-gray-400">زبان:</span><span className="text-white">{t.locale === 'fa' ? 'فارسی' : 'English'}</span></div>
                        <div className="flex justify-between mb-1"><span className="text-gray-400">نام:</span><span className="text-white">{t.name}</span></div>
                        {t.description && <div className="flex justify-between mb-1"><span className="text-gray-400">توضیحات:</span><span className="text-white">{t.description}</span></div>}
                        {t.instructions && <div className="flex justify-between"><span className="text-gray-400">دستورالعمل:</span><span className="text-white">{t.instructions}</span></div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={closeModal} className="mt-6 w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">بستن</button>
            </div>
          </div>
        )}

        {/* ── Create/Edit Modal ── */}
        {(modalType === 'create' || modalType === 'edit') && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeModal}>
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-white mb-4">
                {modalType === 'create' ? 'ایجاد تمرین جدید' : 'ویرایش تمرین'}
              </h2>
              <form onSubmit={modalType === 'create' ? handleCreate : handleUpdate} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">نام انگلیسی *</label>
                    <input type="text" value={formData.name_en} onChange={e => setFormData({...formData, name_en: e.target.value})} className={inputClass(formErrors.name_en)} />
                    {formErrors.name_en && <p className="text-red-400 text-xs mt-1">{formErrors.name_en}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">اسلاگ *</label>
                    <input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} className={inputClass(formErrors.slug)} />
                    {formErrors.slug && <p className="text-red-400 text-xs mt-1">{formErrors.slug}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">توضیحات</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} className={inputClass()} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">گروه عضلانی *</label>
<MobileDrawerSelect
                      value={formData.muscle_group_id}
                      onChange={(v) => setFormData({...formData, muscle_group_id: v})}
                      placeholder="انتخاب گروه عضلانی"
                      options={muscleGroups.map((mg: any) => ({ value: mg.id, label: mg.name }))}
                      dir="rtl"
                      error={!!formErrors.muscle_group_id}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">تجهیزات</label>
<MobileDrawerSelect
                      value={formData.equipment_type_id}
                      onChange={(v) => setFormData({...formData, equipment_type_id: v})}
                      placeholder="انتخاب تجهیزات"
                      options={equipmentTypes.map((eq: any) => ({ value: eq.id, label: eq.name }))}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">نوع تمرین</label>
<MobileDrawerSelect
                      value={formData.exercise_type}
                      onChange={(v) => setFormData({...formData, exercise_type: v})}
                      placeholder="نوع تمرین"
                      options={[
                        { value: 'compound', label: 'ترکیبی' },
                        { value: 'isolation', label: 'مجزا' },
                        { value: 'cardio', label: 'کاردیو' },
                      ]}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">الگوی حرکت</label>
<MobileDrawerSelect
                      value={formData.movement_pattern}
                      onChange={(v) => setFormData({...formData, movement_pattern: v})}
                      placeholder="الگوی حرکتی"
                      options={[
                        { value: 'push', label: 'فشار' },
                        { value: 'pull', label: 'کشش' },
                        { value: 'squat', label: 'اسکات' },
                        { value: 'hinge', label: 'لولایی' },
                        { value: 'lunge', label: 'لانج' },
                        { value: 'carry', label: 'حمل' },
                        { value: 'rotation', label: 'چرخش' },
                      ]}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">سطح دشواری</label>
<MobileDrawerSelect
                      value={formData.difficulty}
                      onChange={(v) => setFormData({...formData, difficulty: v})}
                      placeholder="سطح دشواری"
                      options={[
                        { value: 'beginner', label: 'مبتدی' },
                        { value: 'intermediate', label: 'متوسط' },
                        { value: 'advanced', label: 'پیشرفته' },
                      ]}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">ترتیب</label>
                    <input type="number" value={formData.sort_order} onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})} className={inputClass()} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">تصویر URL</label>
                    <input type="text" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className={inputClass()} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">ویدیو URL</label>
                    <input type="text" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className={inputClass()} />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formData.is_compound} onChange={e => setFormData({...formData, is_compound: e.target.checked})} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    <span className="ml-2 text-sm text-gray-400">ترکیبی</span>
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    <span className="ml-2 text-sm text-gray-400">فعال</span>
                  </label>
                </div>

                {/* Persian Translation Section */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-3">ترجمه فارسی</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">نام فارسی</label>
                      <input type="text" value={formData.fa_name} onChange={e => setFormData({...formData, fa_name: e.target.value})} className={inputClass()} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">توضیحات فارسی</label>
                      <textarea value={formData.fa_description} onChange={e => setFormData({...formData, fa_description: e.target.value})} rows={2} className={inputClass()} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">دستورالعمل فارسی</label>
                      <textarea value={formData.fa_instructions} onChange={e => setFormData({...formData, fa_instructions: e.target.value})} rows={2} className={inputClass()} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="submit" disabled={isPending} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
                    {isPending ? 'در حال ذخیره...' : modalType === 'create' ? 'ایجاد' : 'ذخیره تغییرات'}
                  </button>
                  <button type="button" onClick={closeModal} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">انصراف</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Delete Modal ── */}
        {modalType === 'delete' && selectedExercise && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeModal}>
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-white mb-4">حذف تمرین</h2>
              <p className="text-gray-300 mb-6">
                آیا از حذف تمرین <span className="text-white font-semibold">{selectedExercise.name_en}</span> اطمینان دارید؟
              </p>
              <div className="flex gap-3">
                <button onClick={handleDelete} disabled={isPending} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50">
                  {isPending ? 'در حال حذف...' : 'حذف'}
                </button>
                <button onClick={closeModal} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">انصراف</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}