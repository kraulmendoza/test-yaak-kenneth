<template>
  <div class="inv-date-picker max-w-full space-y-2">
    <div class="relative w-full input-container">
      <button
        type="button"
        class="input-style peer w-full text-left pr-8"
        :disabled="disabled"
        :class="{
          'border-danger': errorMessage,
          'input-style-white': colorWhite
        }"
        @click="openModal"
      >
        <span :class="selected ? 'text-slate-800' : ''">{{ selected ? formattedDate : '' }}</span>
      </button>
      <div
        class="absolute grid w-6 h-6 place-items-center text-silver-800 top-2/4 right-3 -translate-y-2/4 icon"
        :class="{
          'text-white icon-white': colorWhite
        }"
      >
        <i class="fa-solid fa-calendar-days" aria-hidden="true"></i>
      </div>
      <label
        class="label-style before:content[' '] after:content[' ']"
        :class="[
          selected ? '' : 'inv-date-label-empty',
          colorWhite ? (selected ? 'text-white' : 'inv-date-label-white') : '',
          keepShortLabel ? 'keep-short-label' : ''
        ]"
      >
        <span class="full-label">{{ label || placeholder }}</span>
        <span class="short-label">{{ shortLabel || label || placeholder }}</span>
      </label>
    </div>
    <div>
      <p v-if="errorMessage" class="pl-2 text-xs text-danger">
        {{ errorMessage }}
      </p>
    </div>
  </div>

  <Teleport to="body">
    <Transition name="cal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        role="dialog"
        aria-modal="true"
        @click.self="handleCancel"
      >
        <div class="w-full max-w-xs overflow-hidden rounded-2xl bg-white shadow-2xl">
          <template v-if="view === 'date'">
            <!-- Navegación de año -->
            <div class="flex items-center justify-center gap-2 px-4 pt-4">
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-full text-base text-slate-500 hover:bg-slate-100"
                aria-label="Año anterior"
                @click="prevYear"
              >
                «
              </button>
              <button
                type="button"
                class="rounded-md border border-slate-300 bg-white px-4 py-1 text-sm font-semibold text-blue-900 transition-colors hover:border-blue-900 hover:bg-blue-50 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                aria-label="Seleccionar año"
                @click="openYearView"
              >
                {{ viewDate.getFullYear() }}
              </button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-full text-base text-slate-500 hover:bg-slate-100"
                aria-label="Año siguiente"
                @click="nextYear"
              >
                »
              </button>
            </div>

            <!-- Navegación de mes -->
            <div class="mt-2 flex items-center justify-between px-4">
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-500 hover:bg-slate-100"
                aria-label="Mes anterior"
                @click="prevMonth"
              >
                ‹
              </button>
              <p class="text-sm font-semibold capitalize text-slate-800">{{ monthLabel }}</p>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-500 hover:bg-slate-100"
                aria-label="Mes siguiente"
                @click="nextMonth"
              >
                ›
              </button>
            </div>
          </template>

          <!-- Vista de selección de año -->
          <div v-if="view === 'year'" class="mt-3">
            <div class="flex items-center gap-2 px-4">
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-full text-base text-slate-500 hover:bg-slate-100"
                aria-label="Volver al calendario"
                @click="backToDateView"
              >
                ‹
              </button>
              <p class="text-sm font-semibold capitalize text-slate-800">{{ viewDate.getFullYear() }}</p>
              <div class="ml-auto text-xs text-slate-400">{{ yearList[0] }} - {{ yearList[yearList.length - 1] }}</div>
            </div>
            <div ref="yearListRef" class="mt-2 h-72 overflow-y-auto px-4 py-2">
              <button
                v-for="year in yearList"
                :key="year"
                type="button"
                class="mx-auto flex w-24 items-center justify-center rounded-full transition-all"
                :style="{ height: `${YEAR_ITEM_HEIGHT}px` }"
                :class="[
                  year === viewDate.getFullYear()
                    ? 'bg-blue-900 text-xl font-bold text-white'
                    : 'text-sm text-slate-500 hover:bg-slate-100'
                ]"
                @click="selectYear(year)"
              >
                {{ year }}
              </button>
            </div>
          </div>

          <template v-if="view === 'date'">
            <p class="mt-1 px-4 text-center text-xs text-slate-400">{{ selectedDayLabel }}</p>

            <!-- Días de la semana -->
            <div class="mt-3 grid grid-cols-7 px-4 text-center text-xs font-medium text-slate-400">
              <span v-for="(w, i) in weekdayLabels" :key="i" class="capitalize">{{ w }}</span>
            </div>

            <!-- Cuadrícula de días -->
            <div class="grid grid-cols-7 gap-y-1 px-4 pb-4 pt-1 text-center text-sm">
              <button
                v-for="(cell, i) in daysGrid"
                :key="i"
                type="button"
                :disabled="cell.disabled"
                class="mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                :class="[
                  cell.disabled
                    ? 'cursor-not-allowed text-slate-200'
                    : !cell.inCurrentMonth
                      ? 'text-slate-300 hover:bg-slate-100'
                      : 'text-slate-700 hover:bg-slate-100',
                  isSameDay(cell.date, today) && !isSameDay(cell.date, draft)
                    ? 'font-semibold text-emerald-600 hover:bg-emerald-50'
                    : '',
                  isSameDay(cell.date, today) && isSameDay(cell.date, draft)
                    ? 'bg-emerald-500 font-semibold text-white hover:bg-emerald-500'
                    : '',
                  isSameDay(cell.date, draft) && !isSameDay(cell.date, today)
                    ? 'bg-blue-900 font-semibold text-white hover:bg-blue-900'
                    : ''
                ]"
                @click="selectDay(cell)"
              >
                {{ cell.date.getDate() }}
              </button>
            </div>
          </template>

          <!-- Footer: botones configurables -->
          <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="btn in leftButtons"
                :key="btn.key"
                type="button"
                :disabled="btn.disabled"
                class="rounded-full px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                :class="variantClasses[btn.variant ?? 'ghost']"
                @click="handleCustomButton(btn)"
              >
                {{ btn.label }}
              </button>
            </div>
            <div class="ml-auto flex flex-wrap justify-end gap-2">
              <button
                v-for="btn in rightButtons"
                :key="btn.key"
                type="button"
                :disabled="btn.disabled"
                class="rounded-full px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                :class="variantClasses[btn.variant ?? 'secondary']"
                @click="handleCustomButton(btn)"
              >
                {{ btn.label }}
              </button>
              <template v-if="showDefaultButtons">
                <button
                  type="button"
                  class="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                  @click="handleCancel"
                >
                  {{ labelCancel }}
                </button>
                <button
                  type="button"
                  class="rounded-full bg-blue-900 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800"
                  @click="handleConfirm"
                >
                  {{ labelConfirm }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
<script lang="ts" src="./InvDatePickerModal.ts"></script>
<style scoped>
.cal-fade-enter-active,
.cal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.cal-fade-enter-from,
.cal-fade-leave-to {
  opacity: 0;
}

.inv-date-label-empty {
  font-size: 0.875rem;
  line-height: 3.75;
  color: var(--color-silver);
}
.inv-date-label-empty.inv-date-label-white {
  color: #ffffff;
}

/* Estilos base - mostrar label completo, ocultar short-label */
.full-label {
  display: inline;
}
.short-label {
  display: none;
}

/* En pantallas pequeñas */
@media (max-width: 639px) {
  /* Por defecto mostrar short-label */
  .full-label {
    display: none;
  }
  .short-label {
    display: inline;
  }

  /* Pero cuando el input está enfocado o tiene contenido, mostrar label completo */
  .peer:focus ~ .label-style .full-label,
  .peer:not(:placeholder-shown) ~ .label-style .full-label {
    display: inline !important;
  }

  .peer:focus ~ .label-style .short-label,
  .peer:not(:placeholder-shown) ~ .label-style .short-label {
    display: none !important;
  }

  /* Inputs con keep-short-label: mantener el label corto incluso al enfocar o tener contenido */
  .peer:focus ~ .label-style.keep-short-label .full-label,
  .peer:not(:placeholder-shown) ~ .label-style.keep-short-label .full-label {
    display: none !important;
  }

  .peer:focus ~ .label-style.keep-short-label .short-label,
  .peer:not(:placeholder-shown) ~ .label-style.keep-short-label .short-label {
    display: inline !important;
  }
}

/* En pantallas grandes - forzar mostrar label completo */
@media (min-width: 640px) {
  .full-label {
    display: inline !important;
  }
  .short-label {
    display: none !important;
  }
}
</style>
