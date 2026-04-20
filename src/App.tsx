import React, { useState, useMemo, useEffect } from 'react';
import { format, addDays, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { LineChart, Line, ResponsiveContainer, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Plus, Trash2, Archive, ArchiveRestore, X, BarChart2, AlertTriangle, Moon, Sun, Download, Upload, Flame, GripVertical, MessageSquare, Filter, HelpCircle } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type HabitCategory = { id: string; name: string; color: string; };

type DailyHabit = { 
  id: string; 
  name: string; 
  completed: Record<string, any>; 
  notes?: Record<string, string>;
  archived?: boolean;
  categoryId?: string;
  targetType?: 'boolean' | 'number';
  targetValue?: number;
  unit?: string;
};
type WeeklyHabit = { id: string; name: string; completed: Record<number, boolean>; archived?: boolean; categoryId?: string; };
type MonthlyHabit = { id: string; name: string; completed: boolean; archived?: boolean; categoryId?: string; };

const SortableHabitRow = ({ 
  habit, days, categories, updateDailyHabitName, cycleDailyCategory, toggleArchiveDaily, 
  setDailyHabits, toggleDailyHabit, updateDailyHabitValue, renderCheckbox, calculateStreaks,
  setNoteModal, setTargetModal, setValueModal, t
}: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : 1,
  };

  const completedCount = days.filter((d: Date) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    if (habit.targetType === 'number') {
      return (habit.completed[dateStr] as number) >= (habit.targetValue || 1);
    }
    return !!habit.completed[dateStr];
  }).length;
  const progressWidth = `${(completedCount / days.length) * 100}%`;

  return (
    <tr ref={setNodeRef} style={style} className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group ${isDragging ? 'bg-slate-100 dark:bg-slate-800 shadow-lg' : ''}`}>
      <td className="sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-800 p-0 relative w-36 sm:w-48 md:w-56 lg:w-64">
        <div className="flex items-center w-full h-full">
          <div 
            {...attributes} 
            {...listeners} 
            style={{ touchAction: 'none' }}
            className="w-8 h-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors"
            title="Drag to reorder habit"
          >
            <GripVertical size={14} />
          </div>
          <div 
            className="w-3 h-3 rounded-full cursor-pointer flex-shrink-0 border border-slate-300 dark:border-slate-600 ml-2"
            style={{ backgroundColor: habit.categoryId ? categories.find((c: any) => c.id === habit.categoryId)?.color : 'transparent' }}
            onClick={() => cycleDailyCategory(habit.id, habit.categoryId)}
            title={habit.categoryId ? categories.find((c: any) => c.id === habit.categoryId)?.name : 'No Category (Click to change)'}
          />
          <input 
            type="text" 
            value={habit.name}
            onChange={(e) => updateDailyHabitName(habit.id, e.target.value)}
            placeholder="Enter habit..."
            className="flex-1 w-full h-full p-3 bg-transparent focus:outline-none focus:bg-white dark:focus:bg-slate-800 text-slate-700 dark:text-slate-200"
          />
          {habit.name && (
            <div className="pr-3 flex items-center gap-1 text-xs font-medium" title={`Best Streak: ${calculateStreaks(habit).best}`}>
              <Flame size={14} className={calculateStreaks(habit).current > 0 ? "text-orange-500" : "text-slate-300 dark:text-slate-600"} />
              <span className={calculateStreaks(habit).current > 0 ? "text-orange-500" : "text-slate-400 dark:text-slate-500"}>
                {calculateStreaks(habit).current}
              </span>
            </div>
          )}
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => {
              setTargetModal({
                habitId: habit.id,
                type: habit.targetType || 'boolean',
                value: habit.targetValue || 1,
                unit: habit.unit || ''
              });
            }}
            className="active:scale-95 transition-all text-slate-400 hover:text-green-500 transition-colors"
            title={t("setTarget")}
          >
            <BarChart2 size={14} />
          </button>
          <button 
            onClick={() => toggleArchiveDaily(habit.id)}
            className="active:scale-95 transition-all text-slate-400 hover:text-blue-500 transition-colors"
            title={t("archive")}
          >
            <Archive size={14} />
          </button>
          <button 
            onClick={() => setDailyHabits((prev: any) => prev.filter((h: any) => h.id !== habit.id))}
            className="active:scale-95 transition-all text-slate-400 hover:text-red-500 transition-colors"
            title={t("delete")}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
      {days.map((day: Date, i: number) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const hasNote = habit.notes && habit.notes[dateStr];
        return (
          <td 
            key={i} 
            className={`border-b border-slate-200 dark:border-slate-800 p-1 text-center relative group/cell ${i % 7 === 6 ? 'border-r' : ''} ${i % 7 < 2 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}
            onContextMenu={(e) => {
              e.preventDefault();
              setNoteModal({ habitId: habit.id, dateStr, text: hasNote ? habit.notes[dateStr] : '' });
            }}
          >
            <div className="flex justify-center">
              {habit.targetType === 'number' ? (
                <div 
                  className={`w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors ${((habit.completed[dateStr] as number) || 0) >= (habit.targetValue || 1) ? 'bg-[#94b2b0] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  onClick={() => {
                    const currentVal = (habit.completed[dateStr] as number) || 0;
                    const target = habit.targetValue || 1;
                    if (target <= 5) {
                      updateDailyHabitValue(habit.id, dateStr, currentVal >= target ? 0 : currentVal + 1);
                    } else {
                      setValueModal({
                        habitId: habit.id,
                        dateStr,
                        value: currentVal,
                        target,
                        unit: habit.unit || '',
                        name: habit.name
                      });
                    }
                  }}
                  title={`${(habit.completed[dateStr] as number) || 0}/${habit.targetValue || 1} ${habit.unit || ''} (Right click to add note)`}
                >
                  {((habit.completed[dateStr] as number) || 0) > 0 ? ((habit.completed[dateStr] as number) || 0) : '-'}
                </div>
              ) : (
                <div title="Right click to add note">
                  {renderCheckbox(habit.completed[dateStr] || false, () => toggleDailyHabit(habit.id, dateStr))}
                </div>
              )}
            </div>
            {hasNote && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full" title={habit.notes[dateStr]} />
            )}
            <button 
              onClick={() => setNoteModal({ habitId: habit.id, dateStr, text: hasNote ? habit.notes[dateStr] : '' })}
              className="active:scale-95 transition-all absolute bottom-0 right-0 opacity-0 group-hover/cell:opacity-100 text-slate-300 hover:text-slate-500 transition-opacity"
            >
              <MessageSquare size={10} />
            </button>
          </td>
        );
      })}
      <td className="border-b border-l border-slate-200 dark:border-slate-800 p-1 md:p-2 text-center text-xs bg-[#f8f9fa] dark:bg-slate-900/80 w-12 sm:w-16 md:w-20">
        {habit.name ? (
          <div className="flex items-center justify-center gap-1" title={`${completedCount} ${t("daysCompleted")}`}>
            <span className="font-bold text-slate-700 dark:text-slate-200">{completedCount}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">/ {days.length}</span>
          </div>
        ) : ''}
      </td>
      <td className="border-b border-slate-200 dark:border-slate-800 p-1 md:p-2 w-16 sm:w-20 md:w-24">
        {habit.name && (
          <div className="h-4 bg-slate-200 dark:bg-slate-700 w-full rounded-sm overflow-hidden">
            <div className="h-full bg-[#94b2b0] transition-all duration-300" style={{ width: progressWidth }} />
          </div>
        )}
      </td>
    </tr>
  );
};


const TRANSLATIONS = {
  en: {
    title: "Habit Tracker",
    dailyHabits: "Daily Habits",
    weeklyHabits: "Weekly Habits",
    monthlyHabits: "Monthly Habits",
    notes: "Notes",
    addDaily: "+ Add Daily Habit",
    addWeekly: "+ Add Weekly Habit",
    addMonthly: "+ Add Monthly Habit",
    enterDaily: "Enter daily habit...",
    enterWeekly: "Enter weekly habit...",
    enterMonthly: "Enter monthly habit...",
    totalDone: "Total Done",
    overallProgress: "Overall Daily Progress",
    daysCompleted: "days completed",
    weeksCompleted: "weeks completed",
    notesPlaceholder: "Your Notes or Journal goes here...",
    summary: "Summary",
    archive: "Archive",
    clearData: "Clear Data",
    howToUse: "How to Use",
    archivedHabits: "Archived Habits",
    restore: "Restore",
    deletePerm: "Delete Permanently",
    noArchived: "No archived habits.",
    progressSummary: "Progress Summary",
    totalHabits: "Total Habits",
    totalCompletions: "Total Completions",
    bestDaily: "Best Daily Habit",
    bestWeekly: "Best Weekly Habit",
    bestMonthly: "Best Monthly Habit",
    close: "Close",
    clearAllData: "Clear All Data",
    clearWarning: "Are you sure you want to clear all data? This action cannot be undone.",
    cancel: "Cancel",
    yesClear: "Yes, Clear All",
    guideTitle: "How to Use Habit Tracker",
    guideAdd: "Add Habits",
    guideAddDesc: "Type in the input box to create a new habit. Use the templates for quick ideas.",
    guideTrack: "Track Progress",
    guideTrackDesc: "Click the boxes to mark habits as done. Check the \"Total Done\" columns to see your completion count.",
    guideTarget: "Set Targets & View Summary",
    guideTargetDesc: "Hover over a habit row and click the chart icon to set number targets. Click the \"Summary\" button at the top to view overall analytics.",
    guideNotes: "Add Notes",
    guideNotesDesc: "Right-click on any daily box to add a journal note. A yellow dot will appear.",
    guideReorder: "Reorder",
    guideReorderDesc: "Drag and drop the grip icon (⋮⋮) on the left to reorder your habits.",
    guideArchive: "Archive & Categories",
    guideArchiveDesc: "Hover over a habit to archive it. Use the colored tags at the top to filter habits by category.",
    guideStreaks: "Streaks & Progress",
    guideStreaksDesc: "The fire icon (🔥) shows your consecutive daily streaks. Check the 'Overall Progress' bar on the right to see your monthly completion rate.",
    gotIt: "Got it!",
    drinkWater: "💧 Drink Water",
    readPages: "📖 Read 10 Pages",
    meditate: "🧘‍♂️ Meditate 10m",
    allCategories: "All",
    catHealth: "Health",
    catWork: "Work",
    catLearning: "Learning",
    catPersonal: "Personal",
    setTarget: "Set Target",
    addNote: "Add Note",
    delete: "Delete",
    export: "Export",
    import: "Import",
    logout: "Logout"
  },
  id: {
    title: "Pelacak Kebiasaan",
    dailyHabits: "Kebiasaan Harian",
    weeklyHabits: "Kebiasaan Mingguan",
    monthlyHabits: "Kebiasaan Bulanan",
    notes: "Catatan",
    addDaily: "+ Tambah Harian",
    addWeekly: "+ Tambah Mingguan",
    addMonthly: "+ Tambah Bulanan",
    enterDaily: "Masukkan kebiasaan harian...",
    enterWeekly: "Masukkan kebiasaan mingguan...",
    enterMonthly: "Masukkan kebiasaan bulanan...",
    totalDone: "Total Selesai",
    overallProgress: "Progres Harian Keseluruhan",
    daysCompleted: "hari selesai",
    weeksCompleted: "minggu selesai",
    notesPlaceholder: "Catatan atau Jurnal Anda di sini...",
    summary: "Ringkasan",
    archive: "Arsip",
    clearData: "Hapus Data",
    howToUse: "Cara Pakai",
    archivedHabits: "Kebiasaan Diarsipkan",
    restore: "Pulihkan",
    deletePerm: "Hapus Permanen",
    noArchived: "Tidak ada kebiasaan yang diarsipkan.",
    progressSummary: "Ringkasan Progres",
    totalHabits: "Total Kebiasaan",
    totalCompletions: "Total Penyelesaian",
    bestDaily: "Kebiasaan Harian Terbaik",
    bestWeekly: "Kebiasaan Mingguan Terbaik",
    bestMonthly: "Kebiasaan Bulanan Terbaik",
    close: "Tutup",
    clearAllData: "Hapus Semua Data",
    clearWarning: "Apakah Anda yakin ingin menghapus semua data? Tindakan ini tidak dapat dibatalkan.",
    cancel: "Batal",
    yesClear: "Ya, Hapus Semua",
    guideTitle: "Cara Pakai Pelacak Kebiasaan",
    guideAdd: "Tambah Kebiasaan",
    guideAddDesc: "Ketik di kotak input untuk membuat kebiasaan baru. Gunakan templat untuk ide cepat.",
    guideTrack: "Lacak Progres",
    guideTrackDesc: "Klik kotak untuk menandai kebiasaan selesai. Cek kolom \"Total Selesai\" untuk melihat jumlah penyelesaian.",
    guideTarget: "Atur Target & Lihat Ringkasan",
    guideTargetDesc: "Arahkan kursor ke baris kebiasaan dan klik ikon grafik untuk mengatur target angka. Klik tombol \"Ringkasan\" di atas untuk melihat analitik keseluruhan.",
    guideNotes: "Tambah Catatan",
    guideNotesDesc: "Klik kanan pada kotak harian mana saja untuk menambahkan catatan jurnal. Titik kuning akan muncul.",
    guideReorder: "Urutkan Ulang",
    guideReorderDesc: "Tarik dan lepas ikon pegangan (⋮⋮) di sebelah kiri untuk mengurutkan ulang kebiasaan Anda.",
    guideArchive: "Arsip & Kategori",
    guideArchiveDesc: "Arahkan kursor ke kebiasaan untuk mengarsipkannya. Gunakan tag berwarna di atas untuk memfilter kebiasaan berdasarkan kategori.",
    guideStreaks: "Rentetan & Progres",
    guideStreaksDesc: "Ikon api (🔥) menunjukkan rentetan hari berturut-turut Anda. Cek bar 'Progres Keseluruhan' di sebelah kanan untuk melihat tingkat penyelesaian bulanan Anda.",
    gotIt: "Mengerti!",
    drinkWater: "💧 Minum Air",
    readPages: "📖 Baca 10 Halaman",
    meditate: "🧘‍♂️ Meditasi 10m",
    allCategories: "Semua",
    catHealth: "Kesehatan",
    catWork: "Pekerjaan",
    catLearning: "Belajar",
    catPersonal: "Pribadi",
    setTarget: "Atur Target",
    addNote: "Tambah Catatan",
    delete: "Hapus",
    export: "Ekspor",
    import: "Impor",
    logout: "Keluar"
  }
};

export default function App() {
  // --- Session State ---
  const [currentUser, setCurrentUser] = useState<string | null>(() => localStorage.getItem('habitTracker_currentUser'));
  const [loginName, setLoginName] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // --- State ---
  const [startDateStr, setStartDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const startDate = parseISO(startDateStr);

  const [categories, setCategories] = useState<HabitCategory[]>([
    { id: 'cat-1', name: 'Health', color: '#22c55e' }, // green-500
    { id: 'cat-2', name: 'Growth', color: '#3b82f6' }, // blue-500
    { id: 'cat-3', name: 'Productivity', color: '#eab308' }, // yellow-500
    { id: 'cat-4', name: 'Mindfulness', color: '#a855f7' }, // purple-500
  ]);

  const [dailyHabits, setDailyHabits] = useState<DailyHabit[]>([
    { id: '1', name: 'Workout', completed: {} },
    { id: '2', name: 'Short morning walk', completed: {} },
    { id: '3', name: 'Make bed', completed: {} },
    { id: '4', name: 'Read for 30 minutes', completed: {} },
    { id: '5', name: 'Wake up early', completed: {} },
    { id: '6', name: 'Take vitamins', completed: {} },
    { id: '7', name: 'Meditate', completed: {} },
    { id: '8', name: '', completed: {} },
    { id: '9', name: '', completed: {} },
    { id: '10', name: '', completed: {} },
  ]);

  const [weeklyHabits, setWeeklyHabits] = useState<WeeklyHabit[]>([
    { id: '1', name: 'Do laundry', completed: {} },
    { id: '2', name: 'Go biking', completed: {} },
    { id: '3', name: 'Clean living room', completed: {} },
    { id: '4', name: 'Grocery shopping', completed: {} },
    { id: '5', name: '', completed: {} },
  ]);

  const [monthlyHabits, setMonthlyHabits] = useState<MonthlyHabit[]>([
    { id: '1', name: 'Connect with nature', completed: false },
    { id: '2', name: 'Learn something new', completed: false },
    { id: '3', name: '', completed: false },
    { id: '4', name: '', completed: false },
    { id: '5', name: '', completed: false },
  ]);

  const [notes, setNotes] = useState('');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ habitId: string; dateStr: string; text: string } | null>(null);
  const [targetModal, setTargetModal] = useState<{ habitId: string; type: 'boolean' | 'number'; value: number; unit: string } | null>(null);
  const [valueModal, setValueModal] = useState<{ habitId: string; dateStr: string; value: number; target: number; unit: string; name: string } | null>(null);

  // --- Dark Mode State ---
  
  const [language, setLanguage] = useState<'en' | 'id'>(() => {
    const saved = localStorage.getItem('habit_language');
    return (saved === 'en' || saved === 'id') ? saved : 'en';
  });
  useEffect(() => {
    localStorage.setItem('habit_language', language);
  }, [language]);
  const t = (key: keyof typeof TRANSLATIONS.en) => TRANSLATIONS[language][key] || TRANSLATIONS.en[key];

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('habitTracker_darkMode');
    return saved === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('habitTracker_darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  // --- Session & Persistence ---
  useEffect(() => {
    if (currentUser) {
      const savedData = localStorage.getItem(`habitTracker_data_${currentUser}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.dailyHabits) setDailyHabits(parsed.dailyHabits);
          if (parsed.weeklyHabits) setWeeklyHabits(parsed.weeklyHabits);
          if (parsed.monthlyHabits) setMonthlyHabits(parsed.monthlyHabits);
          if (parsed.notes) setNotes(parsed.notes);
          if (parsed.startDateStr) setStartDateStr(parsed.startDateStr);
          if (parsed.categories) setCategories(parsed.categories);
        } catch (e) {
          console.error("Failed to parse saved data", e);
        }
      }
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && isLoaded) {
      const dataToSave = {
        dailyHabits,
        weeklyHabits,
        monthlyHabits,
        notes,
        startDateStr,
        categories
      };
      localStorage.setItem(`habitTracker_data_${currentUser}`, JSON.stringify(dataToSave));
    }
  }, [dailyHabits, weeklyHabits, monthlyHabits, notes, startDateStr, categories, currentUser, isLoaded]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginName.trim()) {
      const name = loginName.trim();
      setCurrentUser(name);
      localStorage.setItem('habitTracker_currentUser', name);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('habitTracker_currentUser');
    window.location.reload();
  };

  const handleExport = () => {
    if (!currentUser) return;
    const dataToSave = {
      dailyHabits,
      weeklyHabits,
      monthlyHabits,
      notes,
      startDateStr,
      categories
    };
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit_tracker_${currentUser}_${format(new Date(), 'yyyyMMdd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.dailyHabits) setDailyHabits(parsed.dailyHabits);
        if (parsed.weeklyHabits) setWeeklyHabits(parsed.weeklyHabits);
        if (parsed.monthlyHabits) setMonthlyHabits(parsed.monthlyHabits);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.startDateStr) setStartDateStr(parsed.startDateStr);
        if (parsed.categories) setCategories(parsed.categories);
      } catch (error) {
        alert('Failed to import data. Invalid file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearData = () => {
    if (currentUser) {
      localStorage.removeItem(`habitTracker_data_${currentUser}`);
      setDailyHabits([
        { id: '1', name: 'Workout', completed: {} },
        { id: '2', name: 'Short morning walk', completed: {} },
        { id: '3', name: 'Make bed', completed: {} },
        { id: '4', name: 'Read for 30 minutes', completed: {} },
        { id: '5', name: 'Wake up early', completed: {} },
        { id: '6', name: 'Take vitamins', completed: {} },
        { id: '7', name: 'Meditate', completed: {} },
        { id: '8', name: '', completed: {} },
        { id: '9', name: '', completed: {} },
        { id: '10', name: '', completed: {} },
      ]);
      setWeeklyHabits([
        { id: '1', name: 'Do laundry', completed: {} },
        { id: '2', name: 'Go biking', completed: {} },
        { id: '3', name: 'Clean living room', completed: {} },
        { id: '4', name: 'Grocery shopping', completed: {} },
        { id: '5', name: '', completed: {} },
      ]);
      setMonthlyHabits([
        { id: '1', name: 'Connect with nature', completed: false },
        { id: '2', name: 'Learn something new', completed: false },
        { id: '3', name: '', completed: false },
        { id: '4', name: '', completed: false },
        { id: '5', name: '', completed: false },
      ]);
      setNotes('');
      setStartDateStr(format(new Date(), 'yyyy-MM-dd'));
      setIsClearDataModalOpen(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setDailyHabits((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // --- Derived Data ---
  const days = useMemo(() => {
    const start = startOfMonth(startDate);
    const end = endOfMonth(startDate);
    return eachDayOfInterval({ start, end });
  }, [startDate]);

  const visibleDailyHabits = useMemo(() => dailyHabits.filter(h => !h.archived && (!filterCategory || h.categoryId === filterCategory)), [dailyHabits, filterCategory]);
  const visibleWeeklyHabits = useMemo(() => weeklyHabits.filter(h => !h.archived), [weeklyHabits]);
  const visibleMonthlyHabits = useMemo(() => monthlyHabits.filter(h => !h.archived), [monthlyHabits]);

  const archivedDailyHabits = useMemo(() => dailyHabits.filter(h => h.archived), [dailyHabits]);
  const archivedWeeklyHabits = useMemo(() => weeklyHabits.filter(h => h.archived), [weeklyHabits]);
  const archivedMonthlyHabits = useMemo(() => monthlyHabits.filter(h => h.archived), [monthlyHabits]);

  const dailyProgressData = useMemo(() => {
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const activeHabits = visibleDailyHabits.filter(h => h.name.trim() !== '');
      const completedCount = activeHabits.filter(h => {
        if (h.targetType === 'number') {
          return (h.completed[dateStr] as number) >= (h.targetValue || 1);
        }
        return h.completed[dateStr];
      }).length;
      const total = activeHabits.length;
      return {
        date: dateStr,
        progress: total > 0 ? (completedCount / total) * 100 : 0,
      };
    });
  }, [days, visibleDailyHabits]);

  const todayStats = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const activeHabits = visibleDailyHabits.filter(h => h.name.trim() !== '');
    const completedCount = activeHabits.filter(h => {
      if (h.targetType === 'number') {
        return (h.completed[todayStr] as number) >= (h.targetValue || 1);
      }
      return h.completed[todayStr];
    }).length;
    return {
      completed: completedCount,
      total: activeHabits.length,
      percentage: activeHabits.length > 0 ? Math.round((completedCount / activeHabits.length) * 100) : 0
    };
  }, [visibleDailyHabits]);

  const overallDailyProgress = useMemo(() => {
    const activeHabits = visibleDailyHabits.filter(h => h.name.trim() !== '');
    let totalCompleted = 0;
    let totalPossible = activeHabits.length * days.length;
    
    activeHabits.forEach(habit => {
      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        if (habit.targetType === 'number') {
          if ((habit.completed[dateStr] as number) >= (habit.targetValue || 1)) totalCompleted++;
        } else {
          if (habit.completed[dateStr]) totalCompleted++;
        }
      });
    });
    
    return {
      percentage: totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0,
      completed: totalCompleted,
      total: totalPossible
    };
  }, [days, visibleDailyHabits]);

  const weeklySummary = useMemo(() => {
    const numWeeks = Math.ceil(days.length / 7);
    return Array.from({ length: numWeeks }).map((_, weekIndex) => {
      const weekDays = days.slice(weekIndex * 7, (weekIndex + 1) * 7);
      const startDay = weekDays[0];
      const endDay = weekDays[weekDays.length - 1];
      const dateRangeStr = `${format(startDay, 'MMM d')} - ${format(endDay, 'MMM d')}`;

      const consistent: string[] = [];
      const needsImprovement: string[] = [];

      // Daily habits logic
      visibleDailyHabits.forEach(habit => {
        if (!habit.name.trim()) return;
        let completedCount = 0;
        weekDays.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          if (habit.targetType === 'number') {
            if ((habit.completed[dateStr] as number) >= (habit.targetValue || 1)) completedCount++;
          } else {
            if (habit.completed[dateStr]) completedCount++;
          }
        });
        const consistentThreshold = Math.ceil(weekDays.length * 0.7);
        const improvementThreshold = Math.floor(weekDays.length * 0.4);
        if (completedCount >= consistentThreshold) consistent.push(habit.name);
        else if (completedCount <= improvementThreshold) needsImprovement.push(habit.name);
      });

      // Weekly habits logic
      visibleWeeklyHabits.forEach(habit => {
        if (!habit.name.trim()) return;
        if (habit.completed[weekIndex]) consistent.push(habit.name);
        else needsImprovement.push(habit.name);
      });

      let insight = "";
      if (consistent.length > 0 && needsImprovement.length > 0) {
        insight = `Your best habit this week was ${consistent[0]}, but you often missed ${needsImprovement[0]}.`;
      } else if (consistent.length > 0) {
        insight = `Great job! You were very consistent with ${consistent[0]} this week.`;
      } else if (needsImprovement.length > 0) {
        insight = `Focus on improving ${needsImprovement[0]} next week.`;
      } else {
        insight = "No data for this week yet.";
      }

      return {
        weekNumber: weekIndex + 1,
        dateRangeStr,
        consistent,
        needsImprovement,
        insight
      };
    });
  }, [days, visibleDailyHabits, visibleWeeklyHabits]);

  const calculateStreaks = (habit: DailyHabit) => {
    const isCompleted = (dateStr: string) => {
      if (habit.targetType === 'number') {
        return (habit.completed[dateStr] as number) >= (habit.targetValue || 1);
      }
      return !!habit.completed[dateStr];
    };

    const dates = Object.keys(habit.completed).filter(k => isCompleted(k)).sort();
    if (dates.length === 0) return { current: 0, best: 0 };
    
    let bestStreak = 0;
    let tempStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = parseISO(dates[i-1]);
      const currDate = parseISO(dates[i]);
      const diff = differenceInDays(currDate, prevDate);
      
      if (diff === 1) {
        tempStreak++;
      } else {
        if (tempStreak > bestStreak) bestStreak = tempStreak;
        tempStreak = 1;
      }
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak;
    
    let currentStreak = 0;
    if (dates.length > 0) {
      const latestDateStr = dates[dates.length - 1];
      let streak = 0;
      let curr = parseISO(latestDateStr);
      while (isCompleted(format(curr, 'yyyy-MM-dd'))) {
        streak++;
        curr = addDays(curr, -1);
      }
      currentStreak = streak;
    }
    
    return { current: currentStreak, best: bestStreak };
  };

  // --- Handlers ---
  const toggleDailyHabit = (habitId: string, dateStr: string) => {
    setDailyHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        if (h.targetType === 'number') {
          // For numbers, we might not want to toggle via simple click if it's a number input,
          // but if they click a checkbox area, maybe we just set it to targetValue or 0.
          const currentVal = (h.completed[dateStr] as number) || 0;
          const target = h.targetValue || 1;
          const newVal = currentVal >= target ? 0 : target;
          return { ...h, completed: { ...h.completed, [dateStr]: newVal } };
        }
        return { ...h, completed: { ...h.completed, [dateStr]: !h.completed[dateStr] } };
      }
      return h;
    }));
  };

  const updateDailyHabitValue = (habitId: string, dateStr: string, value: number) => {
    setDailyHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        return { ...h, completed: { ...h.completed, [dateStr]: value } };
      }
      return h;
    }));
  };

  const updateDailyHabitNote = (habitId: string, dateStr: string, noteText: string) => {
    setDailyHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const newNotes = { ...(h.notes || {}) };
        if (noteText.trim() === '') {
          delete newNotes[dateStr];
        } else {
          newNotes[dateStr] = noteText;
        }
        return { ...h, notes: newNotes };
      }
      return h;
    }));
  };

  const updateDailyHabitName = (id: string, name: string) => {
    setDailyHabits(prev => prev.map(h => h.id === id ? { ...h, name } : h));
  };

  const cycleDailyCategory = (id: string, currentCategoryId?: string) => {
    const currentIndex = categories.findIndex(c => c.id === currentCategoryId);
    const nextIndex = (currentIndex + 1) % (categories.length + 1);
    const nextCategoryId = nextIndex === categories.length ? undefined : categories[nextIndex].id;
    setDailyHabits(prev => prev.map(h => h.id === id ? { ...h, categoryId: nextCategoryId } : h));
  };

  const toggleWeeklyHabit = (habitId: string, weekIndex: number) => {
    setWeeklyHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        return { ...h, completed: { ...h.completed, [weekIndex]: !h.completed[weekIndex] } };
      }
      return h;
    }));
  };

  const updateWeeklyHabitName = (id: string, name: string) => {
    setWeeklyHabits(prev => prev.map(h => h.id === id ? { ...h, name } : h));
  };

  const toggleMonthlyHabit = (habitId: string) => {
    setMonthlyHabits(prev => prev.map(h => h.id === habitId ? { ...h, completed: !h.completed } : h));
  };

  const updateMonthlyHabitName = (id: string, name: string) => {
    setMonthlyHabits(prev => prev.map(h => h.id === id ? { ...h, name } : h));
  };

  const toggleArchiveDaily = (id: string) => {
    setDailyHabits(prev => prev.map(h => h.id === id ? { ...h, archived: !h.archived } : h));
  };

  const toggleArchiveWeekly = (id: string) => {
    setWeeklyHabits(prev => prev.map(h => h.id === id ? { ...h, archived: !h.archived } : h));
  };

  const toggleArchiveMonthly = (id: string) => {
    setMonthlyHabits(prev => prev.map(h => h.id === id ? { ...h, archived: !h.archived } : h));
  };

  const addDailyHabit = () => {
    setDailyHabits(prev => [...prev, { id: Date.now().toString(), name: '', completed: {} }]);
  };

  const addTemplateHabit = (name: string) => {
    setDailyHabits(prev => [...prev, { id: Date.now().toString(), name, completed: {} }]);
  };

  const addWeeklyHabit = () => {
    setWeeklyHabits(prev => [...prev, { id: Date.now().toString(), name: '', completed: {} }]);
  };

  const addMonthlyHabit = () => {
    setMonthlyHabits(prev => [...prev, { id: Date.now().toString(), name: '', completed: false }]);
  };

  // --- Render Helpers ---
  const renderCheckbox = (checked: boolean, onChange: () => void, disabled?: boolean) => (
    <motion.div 
      whileTap={disabled ? undefined : { scale: 0.8 }}
      onClick={disabled ? undefined : onChange}
      className={`w-4 h-4 border flex items-center justify-center transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${
        checked ? 'bg-[#94b2b0] border-[#94b2b0]' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-[#94b2b0] dark:hover:border-[#94b2b0]'
      }`}
    >
      <AnimatePresence>
        {checked && (
          <motion.svg 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="w-3 h-3 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f4f4f2] dark:bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-sm shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-800">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-serif text-slate-800 dark:text-slate-100 mb-2">{t("title")}</h1>
            <p className="text-sm tracking-[0.1em] text-slate-500 dark:text-slate-400 uppercase">Sign in to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Your Name</label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="w-full p-3 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-[#94b2b0] bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 transition-colors text-slate-800 dark:text-slate-100"
                placeholder="Enter your name..."
                required
                autoFocus
              />
            </div>
            <button type="submit" className="active:scale-95 w-full bg-slate-800 dark:bg-slate-700 text-white p-3 font-medium hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors uppercase tracking-wider text-sm">
              Start Tracking
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-[#f4f4f2] dark:bg-slate-950 p-2 sm:p-4 md:p-8 font-sans text-slate-800 dark:text-slate-100">
      <div className="max-w-[1400px] mx-auto bg-white dark:bg-slate-900 shadow-xl rounded-sm overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Top Utility Bar */}
        <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
          <p className="text-[10px] sm:text-xs tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase font-medium">
            Welcome, {currentUser} • Minimalist Habit Tracker
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button className="active:scale-95 transition-all text-slate-400 hover:text-[#94b2b0] p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setIsGuideModalOpen(true)} title="How to use">
              <HelpCircle size={16} />
            </button>
            <button 
              onClick={() => setLanguage(l => l === 'en' ? 'id' : 'en')}
              className="active:scale-95 transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 p-1.5 font-bold text-[10px] flex items-center justify-center w-7 h-7 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 shadow-sm"
              title={language === 'en' ? 'Switch to Indonesian' : 'Ganti ke Bahasa Inggris'}
            >
              {language === 'en' ? 'EN' : 'ID'}
            </button>
            <button className="active:scale-95 transition-all text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
            
            <label className="cursor-pointer active:scale-95 transition-all text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider border bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md shadow-sm flex items-center gap-1.5">
              <Upload size={12} /> {t("import")}
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <button onClick={handleExport} className="active:scale-95 transition-all text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider border bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md shadow-sm flex items-center gap-1.5">
              <Download size={12} /> Export
            </button>
            <button onClick={handleLogout} className="active:scale-95 transition-all text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider border bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 rounded-md shadow-sm">
              {t("logout")}
            </button>
            <button onClick={() => setIsClearDataModalOpen(true)} className="active:scale-95 transition-all text-[10px] font-bold px-3 py-1.5 uppercase tracking-wider border bg-white dark:bg-slate-800 text-red-400 dark:text-red-500 border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-md shadow-sm">
              Clear Data
            </button>
          </div>
        </div>

        {/* Main Header Area */}
        <div className="p-4 sm:p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          <div className="flex-1">
            <h1 className="text-6xl sm:text-7xl font-serif tracking-tight text-slate-900 dark:text-white mb-8">{format(startDate, 'MMMM')}</h1>
            
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center shadow-sm rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-2 sm:py-2.5 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">
                  Select Month
                </div>
                <input 
                  type="month" 
                  value={startDateStr.substring(0, 7)}
                  onChange={(e) => {
                    if (e.target.value) {
                      setStartDateStr(`${e.target.value}-01`);
                    }
                  }}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>
              <button 
                onClick={() => setIsSummaryModalOpen(true)}
                className="active:scale-95 transition-all text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-2 sm:py-2.5 uppercase tracking-wider border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 rounded-md shadow-sm"
              >
                <BarChart2 size={14} /> Weekly Summary
              </button>
              <button 
                onClick={() => setIsArchiveModalOpen(true)}
                className="active:scale-95 transition-all text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-2 sm:py-2.5 uppercase tracking-wider border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 rounded-md shadow-sm"
              >
                <Archive size={14} /> Manage Archive
              </button>
            </div>
          </div>
          
          {/* Quick Stats (Middle Section) */}
          <div className="hidden xl:flex flex-col justify-end pb-1 px-8 border-l border-slate-200 dark:border-slate-800/50 h-full">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Today's Overview</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-serif text-slate-800 dark:text-slate-100">{todayStats.completed}</span>
              <span className="text-lg text-slate-400 dark:text-slate-500">/ {todayStats.total}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Habits Completed</p>
          </div>

          <div className="flex w-full lg:w-auto gap-4">
            {/* Daily Progress Chart */}
            <div className="flex-1 lg:w-80 xl:w-96 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 relative h-32 sm:h-40 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
              <div className="absolute top-3 right-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Daily Progress</div>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyProgressData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(parseISO(val), 'dd')} 
                    tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10}
                  />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: isDarkMode ? '#334155' : '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#94b2b0', fontWeight: 'bold' }}
                    labelStyle={{ color: isDarkMode ? '#cbd5e1' : '#475569', marginBottom: '4px' }}
                    formatter={(value: number) => [`${value.toFixed(0)}%`, 'Progress']}
                    labelFormatter={(label) => format(parseISO(label as string), 'dd MMM yyyy')}
                    cursor={{ stroke: isDarkMode ? '#334155' : '#e2e8f0', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Line 
                    type="natural" 
                    dataKey="progress" 
                    stroke="#94b2b0" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: isDarkMode ? '#0f172a' : '#ffffff', stroke: '#94b2b0', strokeWidth: 2 }} 
                    activeDot={{ r: 6, fill: '#94b2b0', stroke: isDarkMode ? '#0f172a' : '#ffffff', strokeWidth: 2 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Overall Progress Circle */}
            <div className="w-32 sm:w-40 h-32 sm:h-40 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center relative rounded-xl bg-white dark:bg-slate-900 shadow-sm shrink-0">
              <svg viewBox="0 0 128 128" className="w-20 h-20 sm:w-24 sm:h-24 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke={isDarkMode ? "#334155" : "#f1f5f9"} strokeWidth="10" fill="none" />
                <circle 
                  cx="64" cy="64" r="56" 
                  stroke="#94b2b0" 
                  strokeWidth="10" 
                  fill="none" 
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - overallDailyProgress.percentage / 100)}`}
                  className="transition-all duration-500 ease-in-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-200">{overallDailyProgress.percentage.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Habits Table */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2 flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Filter:</span>
          <button 
            onClick={() => setFilterCategory(null)}
            className={`active:scale-95 transition-all text-[10px] px-2 py-1 rounded-sm border transition-colors ${!filterCategory ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`active:scale-95 transition-all text-[10px] px-2 py-1 rounded-sm border transition-colors flex items-center gap-1 ${filterCategory === cat.id ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.name === "Health" ? t("catHealth") : cat.name === "Work" ? t("catWork") : cat.name === "Learning" ? t("catLearning") : cat.name === "Personal" ? t("catPersonal") : cat.name}
            </button>
          ))}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 overflow-x-auto">
          <DndContext 
            sensors={sensors}
            modifiers={[restrictToVerticalAxis]}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full text-sm border-collapse min-w-[800px] xl:min-w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 z-30 bg-[#f8f9fa] dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-800 p-0 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36 sm:w-48 md:w-56 lg:w-64">
                    <div className="flex items-center h-full">
                      <div className="w-8 h-full flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-800/50" title="Drag to reorder habits">
                        <GripVertical size={12} className="text-slate-400" />
                      </div>
                      <div className="p-4 flex-1">{t("dailyHabits")}</div>
                    </div>
                  </th>
                  {Array.from({ length: Math.ceil(days.length / 7) }).map((_, week) => {
                    const daysInWeek = Math.min(7, days.length - week * 7);
                    return (
                      <th key={week} colSpan={daysInWeek} className="bg-[#f8f9fa] dark:bg-slate-900/80 border-b border-r border-slate-200 dark:border-slate-800 p-2 text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                        Week {week + 1}
                      </th>
                    );
                  })}
                  <th className="bg-[#f8f9fa] dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 p-2 text-center text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-12 sm:w-16 md:w-20" title={`${days.length} ${t("daysCompleted")}`}>{t("totalDone").split(" ")[0]}<br/>{t("totalDone").split(" ")[1] || ""}</th>
                  <th className="bg-[#f8f9fa] dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 p-1 md:p-2 text-center text-[8px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-16 sm:w-20 md:w-24">{t("overallProgress")}<br/><span className="text-slate-400 dark:text-slate-500 font-normal">{overallDailyProgress.completed} / {overallDailyProgress.total}</span></th>
                </tr>
                <tr>
                  <th className="sticky left-0 z-30 bg-[#f8f9fa] dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-800"></th>
                  {days.map((day, i) => (
                    <th key={i} className={`border-b border-slate-200 dark:border-slate-800 p-0 sm:p-0.5 text-center text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 ${i % 7 === 6 ? 'border-r' : ''} ${i % 7 < 2 ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
                      <div className="mb-0.5 sm:mb-1">{format(day, 'E')[0]}</div>
                      <div className="text-slate-400 dark:text-slate-500">{format(day, 'd')}</div>
                    </th>
                  ))}
                  <th className="border-b border-slate-200 dark:border-slate-800"></th>
                  <th className="border-b border-slate-200 dark:border-slate-800"></th>
                </tr>
              </thead>
              <SortableContext 
                items={visibleDailyHabits.map(h => h.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {visibleDailyHabits.map((habit) => (
                    <SortableHabitRow 
                      key={habit.id}
                      habit={habit}
                      days={days}
                      categories={categories}
                      updateDailyHabitName={updateDailyHabitName}
                      cycleDailyCategory={cycleDailyCategory}
                      toggleArchiveDaily={toggleArchiveDaily}
                      setDailyHabits={setDailyHabits}
                      toggleDailyHabit={toggleDailyHabit}
                      t={t}
                      updateDailyHabitValue={updateDailyHabitValue}
                      renderCheckbox={renderCheckbox}
                      calculateStreaks={calculateStreaks}
                      setNoteModal={setNoteModal}
                      setTargetModal={setTargetModal}
                      setValueModal={setValueModal}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
        <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center flex-wrap gap-2">
            <button onClick={addDailyHabit} className="active:scale-95 flex items-center text-xs text-slate-500 dark:text-slate-400 hover:text-[#94b2b0] dark:hover:text-[#94b2b0] transition-colors font-medium">
              <Plus size={14} className="mr-1" /> Add Daily Habit
            </button>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Quick Add:</span>
              <button onClick={() => addTemplateHabit('💧 Drink 2L Water')} className="active:scale-95 transition-all text-[10px] px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">💧 Drink 2L Water</button>
              <button onClick={() => addTemplateHabit('📖 Read 10 Pages')} className="active:scale-95 transition-all text-[10px] px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">{t("readPages")}</button>
              <button onClick={() => addTemplateHabit('🧘‍♂️ Meditate 10m')} className="active:scale-95 transition-all text-[10px] px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">{t("meditate")}</button>
            </div>
          </div>

        {/* Bottom Section: Weekly, Monthly, Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-slate-200 dark:border-slate-800">
          
          {/* Weekly Habits */}
          <div className="lg:col-span-5 border-r border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-30 bg-[#f8f9fa] dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-800 p-3 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36 sm:w-48 md:w-56">{t("weeklyHabits")}</th>
                  {Array.from({ length: Math.ceil(days.length / 7) }).map((_, week) => (
                    <th key={week} className="bg-[#f8f9fa] dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 p-2 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-12">
                      <div>W{week + 1}</div>
                      <div className="text-slate-400 dark:text-slate-500 font-normal mt-1">{format(days[week * 7], 'dd/MM')}</div>
                    </th>
                  ))}
                  <th className="bg-[#f8f9fa] dark:bg-slate-900/80 border-b border-l border-slate-200 dark:border-slate-800 p-2 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-12 sm:w-16 md:w-20" title={`${Math.ceil(days.length / 7)} ${t("weeksCompleted")}`}>
                    Total<br/>Done
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleWeeklyHabits.map((habit) => (
                  <tr key={habit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                  <td className="sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-800 p-0 relative w-36 sm:w-48 md:w-56">
                      <input 
                        type="text" 
                        value={habit.name}
                        onChange={(e) => updateWeeklyHabitName(habit.id, e.target.value)}
                        placeholder={t("enterWeekly")}
                        className="w-full h-full p-3 bg-transparent focus:outline-none focus:bg-white dark:focus:bg-slate-800 text-slate-700 dark:text-slate-200"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                        <button 
                          onClick={() => toggleArchiveWeekly(habit.id)}
                          className="active:scale-95 transition-all text-slate-400 hover:text-blue-500 transition-colors"
                          title={t("archive")}
                        >
                          <Archive size={14} />
                        </button>
                        <button 
                          onClick={() => setWeeklyHabits(prev => prev.filter(h => h.id !== habit.id))}
                          className="active:scale-95 transition-all text-slate-400 hover:text-red-500 transition-colors"
                          title={t("delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    {Array.from({ length: Math.ceil(days.length / 7) }).map((_, week) => (
                      <td key={week} className="border-b border-slate-200 dark:border-slate-800 p-2 text-center">
                        <div className="flex justify-center">
                          {renderCheckbox(habit.completed[week] || false, () => toggleWeeklyHabit(habit.id, week))}
                        </div>
                      </td>
                    ))}
                    <td className="border-b border-l border-slate-200 dark:border-slate-800 p-1 md:p-2 text-center text-xs bg-[#f8f9fa] dark:bg-slate-900/80 w-12 sm:w-16 md:w-20">
                      {habit.name ? (
                        <div className="flex items-center justify-center gap-1" title={`${Object.values(habit.completed).filter(Boolean).length} ${t("weeksCompleted")}`}>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{Object.values(habit.completed).filter(Boolean).length}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">/ {Math.ceil(days.length / 7)}</span>
                        </div>
                      ) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-2 border-b lg:border-b-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 h-full">
              <button onClick={addWeeklyHabit} className="active:scale-95 flex items-center text-xs text-slate-500 dark:text-slate-400 hover:text-[#94b2b0] transition-colors font-medium">
                <Plus size={14} className="mr-1" /> Add Weekly Habit
              </button>
            </div>
          </div>

          {/* Monthly Habits */}
          <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-30 bg-[#f8f9fa] dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-800 p-3 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36 sm:w-48 md:w-56">{t("monthlyHabits")}</th>
                  <th className="bg-[#f8f9fa] dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 p-2 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-16">
                    <div>{visibleMonthlyHabits.filter(h => h.name).length > 0 ? Math.round((visibleMonthlyHabits.filter(h => h.completed).length / visibleMonthlyHabits.filter(h => h.name).length) * 100) : 0}%</div>
                    <div className="text-slate-400 dark:text-slate-500 font-normal mt-1">{visibleMonthlyHabits.filter(h => h.completed).length} / {visibleMonthlyHabits.filter(h => h.name).length}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleMonthlyHabits.map((habit) => (
                  <tr key={habit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                  <td className="sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-800 p-0 relative w-36 sm:w-48 md:w-56">
                      <input 
                        type="text" 
                        value={habit.name}
                        onChange={(e) => updateMonthlyHabitName(habit.id, e.target.value)}
                        placeholder={t("enterMonthly")}
                        className="w-full h-full p-3 bg-transparent focus:outline-none focus:bg-white dark:focus:bg-slate-800 text-slate-700 dark:text-slate-200"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                        <button 
                          onClick={() => toggleArchiveMonthly(habit.id)}
                          className="active:scale-95 transition-all text-slate-400 hover:text-blue-500 transition-colors"
                          title={t("archive")}
                        >
                          <Archive size={14} />
                        </button>
                        <button 
                          onClick={() => setMonthlyHabits(prev => prev.filter(h => h.id !== habit.id))}
                          className="active:scale-95 transition-all text-slate-400 hover:text-red-500 transition-colors"
                          title={t("delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="border-b border-slate-200 dark:border-slate-800 p-2 text-center">
                      <div className="flex justify-center">
                        {renderCheckbox(habit.completed, () => toggleMonthlyHabit(habit.id))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-2 border-b lg:border-b-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 h-full">
              <button onClick={addMonthlyHabit} className="active:scale-95 flex items-center text-xs text-slate-500 dark:text-slate-400 hover:text-[#94b2b0] transition-colors font-medium">
                <Plus size={14} className="mr-1" /> Add Monthly Habit
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="lg:col-span-3 flex flex-col">
            <div className="bg-[#f8f9fa] dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 p-3 text-center font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              Notes
            </div>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              className="flex-1 w-full p-4 bg-transparent focus:outline-none resize-none text-sm text-slate-700 dark:text-slate-200"
            />
          </div>

        </div>
      </div>

      {/* Archive Modal */}
      <AnimatePresence>
      {isArchiveModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white dark:bg-slate-900 rounded-md shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-md">
              <h2 className="text-2xl font-serif text-slate-800 dark:text-slate-100">{t("archivedHabits")}</h2>
              <button onClick={() => setIsArchiveModalOpen(false)} className="active:scale-95 transition-all text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {archivedDailyHabits.length === 0 && archivedWeeklyHabits.length === 0 && archivedMonthlyHabits.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Archive size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No archived habits found.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Daily Archives */}
                  {archivedDailyHabits.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">{t("dailyHabits")}</h3>
                      <ul className="space-y-2">
                        {archivedDailyHabits.map(habit => (
                          <li key={habit.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-sm hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{habit.name || '(Untitled)'}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleArchiveDaily(habit.id)} className="active:scale-95 transition-all flex items-center gap-1 text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#94b2b0] dark:hover:text-[#94b2b0] hover:border-[#94b2b0] dark:hover:border-[#94b2b0] rounded-sm transition-colors">
                                <ArchiveRestore size={14} /> Restore
                              </button>
                              <button onClick={() => setDailyHabits(prev => prev.filter(h => h.id !== habit.id))} className="active:scale-95 transition-all flex items-center gap-1 text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 rounded-sm transition-colors">
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weekly Archives */}
                  {archivedWeeklyHabits.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">{t("weeklyHabits")}</h3>
                      <ul className="space-y-2">
                        {archivedWeeklyHabits.map(habit => (
                          <li key={habit.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-sm hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{habit.name || '(Untitled)'}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleArchiveWeekly(habit.id)} className="active:scale-95 transition-all flex items-center gap-1 text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#94b2b0] dark:hover:text-[#94b2b0] hover:border-[#94b2b0] dark:hover:border-[#94b2b0] rounded-sm transition-colors">
                                <ArchiveRestore size={14} /> Restore
                              </button>
                              <button onClick={() => setWeeklyHabits(prev => prev.filter(h => h.id !== habit.id))} className="active:scale-95 transition-all flex items-center gap-1 text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 rounded-sm transition-colors">
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Monthly Archives */}
                  {archivedMonthlyHabits.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">{t("monthlyHabits")}</h3>
                      <ul className="space-y-2">
                        {archivedMonthlyHabits.map(habit => (
                          <li key={habit.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-sm hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{habit.name || '(Untitled)'}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleArchiveMonthly(habit.id)} className="active:scale-95 transition-all flex items-center gap-1 text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#94b2b0] dark:hover:text-[#94b2b0] hover:border-[#94b2b0] dark:hover:border-[#94b2b0] rounded-sm transition-colors">
                                <ArchiveRestore size={14} /> Restore
                              </button>
                              <button onClick={() => setMonthlyHabits(prev => prev.filter(h => h.id !== habit.id))} className="active:scale-95 transition-all flex items-center gap-1 text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 rounded-sm transition-colors">
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Weekly Summary Modal */}
      <AnimatePresence>
      {isSummaryModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white dark:bg-slate-900 rounded-md shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-md">
              <h2 className="text-2xl font-serif text-slate-800 dark:text-slate-100">Weekly Summary</h2>
              <button onClick={() => setIsSummaryModalOpen(false)} className="active:scale-95 transition-all text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              {weeklySummary.map(week => (
                <div key={week.weekNumber} className="border border-slate-200 dark:border-slate-800 rounded-sm overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800/30 p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-sm">Week {week.weekNumber}</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{week.dateRangeStr}</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[#94b2b0] mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Consistently Met
                      </h4>
                      {week.consistent.length > 0 ? (
                        <ul className="space-y-1">
                          {week.consistent.map((habit, i) => <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2"><span className="text-[#94b2b0] mt-0.5">•</span> {habit}</li>)}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400 dark:text-slate-500 italic">No habits consistently met this week.</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-2">
                        <AlertTriangle size={14} />
                        Needs Improvement
                      </h4>
                      {week.needsImprovement.length > 0 ? (
                        <ul className="space-y-1">
                          {week.needsImprovement.map((habit, i) => <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span> {habit}</li>)}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400 dark:text-slate-500 italic">Great job! No areas need improvement.</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-[#f4f4f2] dark:bg-slate-950 p-3 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                      <span className="font-bold text-slate-700 dark:text-slate-300 not-italic mr-1">Insight:</span>
                      {week.insight}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Clear Data Confirmation Modal */}
      <AnimatePresence>
      {isClearDataModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white dark:bg-slate-900 rounded-md shadow-2xl w-full max-w-md flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-red-50 dark:bg-red-900/20 flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle size={24} />
              <h2 className="text-xl font-serif font-bold">{t("clearAllData")}</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-700 dark:text-slate-300 mb-6">Are you sure you want to clear all your habit data? This action cannot be undone and will reset your tracker to its default state.</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsClearDataModalOpen(false)}
                  className="active:scale-95 transition-all px-4 py-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleClearData}
                  className="active:scale-95 px-4 py-2 text-sm font-bold uppercase tracking-wider bg-red-500 text-white hover:bg-red-600 dark:hover:bg-red-600 rounded-sm transition-colors shadow-sm"
                >
                  Yes, Clear Data
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      {/* Note Modal */}
      <AnimatePresence>
      {noteModal && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white dark:bg-slate-900 rounded-md shadow-2xl w-full max-w-md flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-serif font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare size={18} /> Daily Note
              </h2>
              <button onClick={() => setNoteModal(null)} className="active:scale-95 transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium uppercase tracking-wider">
                {format(parseISO(noteModal.dateStr), 'EEEE, MMMM d, yyyy')}
              </p>
              <textarea 
                value={noteModal.text}
                onChange={(e) => setNoteModal({ ...noteModal, text: e.target.value })}
                placeholder="How did it go today? Any obstacles or wins?"
                className="w-full h-32 p-3 border border-slate-200 dark:border-slate-700 rounded-sm focus:outline-none focus:border-[#94b2b0] dark:focus:border-[#94b2b0] bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 resize-none text-sm"
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-2">
                <button 
                  onClick={() => setNoteModal(null)}
                  className="active:scale-95 transition-all px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    updateDailyHabitNote(noteModal.habitId, noteModal.dateStr, noteModal.text);
                    setNoteModal(null);
                  }}
                  className="active:scale-95 transition-all px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#94b2b0] text-white hover:bg-[#7a9694] rounded-sm transition-colors shadow-sm"
                >
                  Save Note
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Target Modal */}
      <AnimatePresence>
      {targetModal && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white dark:bg-slate-900 rounded-md shadow-2xl w-full max-w-sm flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-serif font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BarChart2 size={18} /> Set Target
              </h2>
              <button onClick={() => setTargetModal(null)} className="active:scale-95 transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Target Type</label>
                <select 
                  value={targetModal.type}
                  onChange={(e) => setTargetModal({ ...targetModal, type: e.target.value as 'boolean' | 'number' })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#94b2b0] text-slate-700 dark:text-slate-200"
                >
                  <option value="boolean">Yes/No (Checkbox)</option>
                  <option value="number">Numeric Target</option>
                </select>
              </div>
              
              {targetModal.type === 'number' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Target Value</label>
                    <input 
                      type="number" 
                      min="1"
                      value={targetModal.value}
                      onChange={(e) => setTargetModal({ ...targetModal, value: parseInt(e.target.value, 10) || 1 })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#94b2b0] text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Unit (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g., glasses, pages, km"
                      value={targetModal.unit}
                      onChange={(e) => setTargetModal({ ...targetModal, unit: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#94b2b0] text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
              <button onClick={() => setTargetModal(null)} className="active:scale-95 transition-all px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors">Cancel</button>
              <button 
                onClick={() => {
                  if (targetModal.type === 'number') {
                    setDailyHabits((prev: any) => prev.map((h: any) => h.id === targetModal.habitId ? { ...h, targetType: 'number', targetValue: targetModal.value, unit: targetModal.unit } : h));
                  } else {
                    setDailyHabits((prev: any) => prev.map((h: any) => h.id === targetModal.habitId ? { ...h, targetType: 'boolean' } : h));
                  }
                  setTargetModal(null);
                }}
                className="active:scale-95 transition-all px-4 py-2 text-sm font-medium bg-[#94b2b0] text-white rounded-md hover:bg-[#7a9694] transition-colors shadow-sm"
              >
                Save Target
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Value Modal */}
      <AnimatePresence>
      {valueModal && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white dark:bg-slate-900 rounded-md shadow-2xl w-full max-w-sm flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-serif font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BarChart2 size={18} /> Enter Value
              </h2>
              <button onClick={() => setValueModal(null)} className="active:scale-95 transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Enter value for <strong className="text-slate-900 dark:text-white">{valueModal.name}</strong> on {format(parseISO(valueModal.dateStr), 'MMM d')}.
                <br />
                <span className="text-xs text-slate-500 dark:text-slate-400">Target: {valueModal.target} {valueModal.unit}</span>
              </p>
              <input 
                type="number" 
                min="0"
                value={valueModal.value}
                onChange={(e) => setValueModal({ ...valueModal, value: parseInt(e.target.value, 10) || 0 })}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#94b2b0] text-slate-700 dark:text-slate-200 text-center text-xl font-bold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateDailyHabitValue(valueModal.habitId, valueModal.dateStr, valueModal.value);
                    setValueModal(null);
                  }
                }}
              />
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
              <button onClick={() => setValueModal(null)} className="active:scale-95 transition-all px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors">Cancel</button>
              <button 
                onClick={() => {
                  updateDailyHabitValue(valueModal.habitId, valueModal.dateStr, valueModal.value);
                  setValueModal(null);
                }}
                className="active:scale-95 transition-all px-4 py-2 text-sm font-medium bg-[#94b2b0] text-white rounded-md hover:bg-[#7a9694] transition-colors shadow-sm"
              >
                Save Value
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Guide Modal */}
      <AnimatePresence>
      {isGuideModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white dark:bg-slate-900 rounded-md shadow-2xl w-full max-w-lg flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-serif font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <HelpCircle size={18} /> How to Use Habit Tracker
              </h2>
              <button onClick={() => setIsGuideModalOpen(false)} className="active:scale-95 transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#94b2b0]"><Plus size={16} /></div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 block">{t("guideAdd")}</strong>
                  {t("guideAddDesc")}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#94b2b0]">✓</div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 block">{t("guideTrack")}</strong>
                  {t("guideTrackDesc")}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#94b2b0]"><BarChart2 size={16} /></div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 block">{t("guideTarget")}</strong>
                  {t("guideTargetDesc")}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#94b2b0]"><MessageSquare size={16} /></div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 block">{t("guideNotes")}</strong>
                  {t("guideNotesDesc")}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#94b2b0]"><GripVertical size={16} /></div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 block">{t("guideReorder")}</strong>
                  {t("guideReorderDesc")}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#94b2b0]"><Archive size={16} /></div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 block">{t("guideArchive")}</strong>
                  {t("guideArchiveDesc")}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-orange-500"><Flame size={16} /></div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 block">{t("guideStreaks")}</strong>
                  {t("guideStreaksDesc")}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button 
                onClick={() => setIsGuideModalOpen(false)}
                className="active:scale-95 transition-all px-6 py-2 text-xs font-bold uppercase tracking-wider bg-[#94b2b0] text-white hover:bg-[#7a9694] rounded-sm transition-colors shadow-sm"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
