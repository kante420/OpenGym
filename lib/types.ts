export type Role = 'ADMINISTRADOR' | 'ENTRENADOR' | 'CLIENTE';
export type BillingStatus = 'AL_DIA' | 'PENDIENTE' | 'VENCIDO' | 'SIN_ACTIVIDAD';
export type PaymentMethod = 'Efectivo' | 'Bizum' | 'Transferencia';
export const PAYMENT_METHODS: PaymentMethod[] = ['Bizum', 'Transferencia', 'Efectivo'];

export interface Gym {
  id: string;
  name: string;
  subdomain: string;
  legal_name: string | null;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  contact_email: string | null;
  vat_rate: number;
  prices_include_vat: boolean;
  receipt_prefix: string;
  status: 'active' | 'suspended';
  max_members: number;
  city: string | null;
  province: string | null;
  country: string | null;
  postal_code: string | null;
  director_name: string | null;
  website: string | null;
  size_range: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface Profile {
  id: string;
  gym_id: string;
  full_name: string;
  username: string;
  email: string | null;
  dni: string | null;
  birth_date: string | null;
  phone: string | null;
  role: Role;
  active: boolean;
  created_at: string;
}

export interface Zone { id: string; gym_id: string; name: string }

export interface ClassRow {
  id: string;
  gym_id: string;
  zone_id: string | null;
  title: string;
  price: number;
  days_of_week: string | null;
  schedule_time: string | null;
  capacity: number | null;
  trainer_id: string | null;
  active: boolean;
  zones?: { name: string } | null;
}

export interface Booking { id: string; class_id: string; user_id: string }

export interface DiscountRule { id: string; gym_id: string; min_classes: number; discount_percentage: number }

export interface MemberBilling {
  user_id: string;
  gym_id: string;
  full_name: string;
  username: string;
  email: string | null;
  dni: string | null;
  phone: string | null;
  active: boolean;
  class_count: number;
  base_total: number;
  discount_pct: number;
  total_due: number;
  subscription_id: string | null;
  last_payment_date: string | null;
  renewal_date: string | null;
  billing_status: BillingStatus;
  /** Lo que se factura: base imponible + IVA = total (calculado en la base de datos). */
  vat_rate: number;
  charge_base: number;
  charge_vat: number;
  charge_total: number;
}

export interface Receipt {
  id: string;
  gym_id: string;
  user_id: string;
  amount: number;
  base_amount: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  payment_date: string;
  concept: string;
  payment_method: string | null;
  receipt_code: string | null;
  period_start: string | null;
  period_end: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
}

export interface RoutineExercise { name: string; sets: number; reps: number }
export interface RoutineBlock { name: string; exercises: RoutineExercise[] }

export interface WorkoutLog {
  id: string;
  gym_id: string;
  class_id: string;
  title: string;
  description: string | null;
  structure: RoutineBlock[] | null;
  log_date: string;
  is_completed: boolean;
  classes?: { title: string } | null;
}

export interface StudentLog {
  id: string;
  workout_log_id: string;
  user_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number | null;
  created_at: string;
  workout_logs?: { title: string; log_date: string } | null;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  measured_on: string;
  weight_kg: number;
  body_fat_pct: number | null;
  note: string | null;
}

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string };
