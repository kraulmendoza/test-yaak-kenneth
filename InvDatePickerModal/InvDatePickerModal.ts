import { computed, defineComponent, nextTick, PropType, ref } from 'vue';
import moment from 'moment';
import type { CalendarButtonConfig, CalendarButtonVariant } from '../../../domain/entities/InvDatePickerModal.types';

function stripTime(date: Date): Date {
  return moment(date).startOf('day').toDate();
}

function parseMoment(value: Date | string | number | null | undefined): moment.Moment | null {
  if (value === null || value === undefined || value === '') return null;
  let target: moment.Moment;
  if (moment.isDate(value)) {
    target = moment(value);
  } else if (typeof value === 'number') {
    target = moment(value);
  } else {
    const str = String(value).trim();
    const formats = ['DD/MM/YYYY', 'D/M/YYYY', 'D/MM/YYYY', 'DD/M/YYYY', 'YYYY-MM-DD', 'YYYY/MM/DD'];
    target = moment(str, formats, true);
    if (!target.isValid()) target = moment(str);
  }
  return target.isValid() ? target : null;
}

function normalizeDate(value: Date | string | number | null | undefined): Date | null {
  const parsed = parseMoment(value);
  return parsed ? parsed.startOf('day').toDate() : null;
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface DayCell {
  date: Date;
  inCurrentMonth: boolean;
  disabled: boolean;
}

export default defineComponent({
  name: 'InvDatePickerModal',
  props: {
    modelValue: { type: [Date, String, Number] as PropType<Date | string | number | null>, default: null },
    locale: { type: String, default: 'es-ES' },
    minDate: { type: [Date, String, Number] as PropType<Date | string | number | null>, default: null },
    maxDate: { type: [Date, String, Number] as PropType<Date | string | number | null>, default: null },
    weekStartsOn: { type: Number as PropType<0 | 1>, default: 0 },
    buttons: { type: Array as PropType<CalendarButtonConfig[]>, default: () => [] },
    showDefaultButtons: { type: Boolean, default: true },
    labelCancel: { type: String, default: 'Cancelar' },
    labelConfirm: { type: String, default: 'Aceptar' },
    placeholder: { type: String, default: 'Seleccionar fecha' },
    format: { type: String, default: 'DD/MM/YYYY' },
    outputFormat: { type: String, default: 'YYYY-MM-DD' },
    label: { type: String, default: '' },
    shortLabel: { type: String, default: '' },
    keepShortLabel: { type: Boolean, default: false },
    errorMessage: { type: String, default: '' },
    colorWhite: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'update:open', 'confirm', 'cancel', 'button-click'],
  setup(props, { emit }) {
    const today = stripTime(new Date());
    const open = ref<boolean>(false);
    const view = ref<'date' | 'year'>('date');
    const yearListRef = ref<HTMLElement | null>(null);
    const YEAR_ITEM_HEIGHT = 44;

    const selected = computed<Date | null>(() => normalizeDate(props.modelValue));
    const min = computed<Date | null>(() => normalizeDate(props.minDate));
    const max = computed<Date | null>(() => normalizeDate(props.maxDate));

    const draft = ref<Date | null>(selected.value ? new Date(selected.value) : new Date(today));
    const viewDate = ref<Date>(draft.value ? new Date(draft.value) : new Date(today));

    const openModal = (): void => {
      draft.value = selected.value ? new Date(selected.value) : new Date(today);
      viewDate.value = draft.value ? new Date(draft.value) : new Date(today);
      view.value = 'date';
      open.value = true;
    };

    const closeModal = (): void => {
      open.value = false;
      emit('update:open', false);
    };

    const handleCancel = (): void => {
      emit('cancel');
      closeModal();
    };

    const handleConfirm = (): void => {
      const value = draft.value ? moment(draft.value).format(props.outputFormat) : null;
      emit('update:modelValue', value);
      emit('confirm', value);
      closeModal();
    };

    const handleCustomButton = (btn: CalendarButtonConfig): void => {
      const value = draft.value ? moment(draft.value).format(props.outputFormat) : null;
      emit('button-click', btn.key, value);
      if (btn.closeOnClick) closeModal();
    };

    const formattedDate = computed<string>(() =>
      selected.value ? moment(selected.value).format(props.format) : props.placeholder
    );

    const selectedDayLabel = computed<string>(() =>
      draft.value ? moment(draft.value).format(props.format) : props.placeholder
    );

    const monthLabel = computed<string>(() =>
      viewDate.value.toLocaleDateString(props.locale, { month: 'long', year: 'numeric' })
    );

    const yearList = computed<number[]>(() => {
      const year = viewDate.value.getFullYear();
      const from = Math.min(year, today.getFullYear()) - 160;
      const to = Math.max(year, today.getFullYear()) + 160;
      const lo = min.value ? Math.max(from, min.value.getFullYear()) : from;
      const hi = max.value ? Math.min(to, max.value.getFullYear()) : to;
      const years: number[] = [];
      for (let y = lo; y <= hi; y++) years.push(y);
      return years;
    });

    const weekdayLabels = computed<string[]>(() => {
      const fmt = new Intl.DateTimeFormat(props.locale, { weekday: 'narrow' });
      const sunday = new Date(2023, 0, 1);
      const days: string[] = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(sunday);
        day.setDate(sunday.getDate() + i);
        days.push(fmt.format(day));
      }
      return props.weekStartsOn === 1 ? [...days.slice(1), days[0]] : days;
    });

    const daysGrid = computed<DayCell[]>(() => {
      const year = viewDate.value.getFullYear();
      const month = viewDate.value.getMonth();
      const firstOfMonth = moment({ year, month, day: 1 });
      const startOffset = props.weekStartsOn === 1 ? (firstOfMonth.day() + 6) % 7 : firstOfMonth.day();
      const cursor = firstOfMonth.clone().subtract(startOffset, 'day');

      const cells: DayCell[] = [];
      for (let i = 0; i < 42; i++) {
        const date = cursor.toDate();
        const disabled = (min.value ? date < min.value : false) || (max.value ? date > max.value : false);
        cells.push({ date, inCurrentMonth: cursor.month() === month, disabled });
        cursor.add(1, 'day');
      }
      return cells;
    });

    const selectDay = (cell: DayCell): void => {
      if (cell.disabled) return;
      draft.value = new Date(cell.date);
      if (!cell.inCurrentMonth) viewDate.value = new Date(cell.date);
    };

    const prevMonth = (): void => {
      viewDate.value = moment(viewDate.value).subtract(1, 'month').startOf('month').toDate();
    };

    const nextMonth = (): void => {
      viewDate.value = moment(viewDate.value).add(1, 'month').startOf('month').toDate();
    };

    const prevYear = (): void => {
      viewDate.value = moment(viewDate.value).subtract(1, 'year').startOf('month').toDate();
    };

    const nextYear = (): void => {
      viewDate.value = moment(viewDate.value).add(1, 'year').startOf('month').toDate();
    };

    const openYearView = (): void => {
      view.value = 'year';
      nextTick(() => {
        const el = yearListRef.value;
        if (!el || yearList.value.length === 0) return;
        const index = yearList.value.indexOf(viewDate.value.getFullYear());
        const scrollTop = index * YEAR_ITEM_HEIGHT - (el.clientHeight - YEAR_ITEM_HEIGHT) / 2;
        el.scrollTop = Math.max(0, scrollTop);
      });
    };

    const backToDateView = (): void => {
      view.value = 'date';
    };

    const selectYear = (year: number): void => {
      const base = draft.value ?? viewDate.value;
      const daysInMonth = new Date(year, base.getMonth() + 1, 0).getDate();
      const updated = new Date(year, base.getMonth(), Math.min(base.getDate(), daysInMonth));
      draft.value = updated;
      viewDate.value = updated;
      view.value = 'date';
    };

    const variantClasses: Record<CalendarButtonVariant, string> = {
      primary: 'bg-blue-900 text-white hover:bg-blue-800',
      secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
      outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
      ghost: 'text-slate-500 hover:bg-slate-100'
    };

    const leftButtons = computed(() => props.buttons.filter((btn) => btn.position === 'left'));
    const rightButtons = computed(() => props.buttons.filter((btn) => btn.position !== 'left'));

    return {
      open,
      view,
      yearListRef,
      YEAR_ITEM_HEIGHT,
      selected,
      draft,
      today,
      viewDate,
      formattedDate,
      selectedDayLabel,
      monthLabel,
      yearList,
      weekdayLabels,
      daysGrid,
      variantClasses,
      leftButtons,
      rightButtons,
      isSameDay,
      selectDay,
      prevMonth,
      nextMonth,
      prevYear,
      nextYear,
      openYearView,
      backToDateView,
      selectYear,
      openModal,
      handleCancel,
      handleConfirm,
      handleCustomButton
    };
  }
});
