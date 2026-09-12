export type CalendarButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export interface CalendarButtonConfig {
  /** Identificador único, se emite en el evento `button-click` */
  key: string;
  /** Texto del botón */
  label: string;
  /** Estilo visual del botón */
  variant?: CalendarButtonVariant;
  /** Lado del footer donde se renderiza ("left" | "right"). Por defecto "right" */
  position?: 'left' | 'right';
  /** Si es true, al hacer click también se cierra el modal */
  closeOnClick?: boolean;
  /** Deshabilita el botón */
  disabled?: boolean;
}
