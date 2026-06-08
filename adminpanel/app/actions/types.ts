// Admin Panel Types
// Shared types for admin server actions

export type UserRole = 'athlete' | 'gym_manager' | 'coach' | 'doctor' | 'admin';

export interface Profile {
  id: string;
  mobile_number: string;
  role: UserRole;
  country_id: string | null;
  full_name: string | null;
  wallet_balance: number;
  onboarding_completed: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface Gym {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  price_per_session: number;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  avg_rating: number;
  review_count: number;
  open_time: string;
  close_time: string;
  country_id: string;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  athlete_id: string;
  gym_id: string;
  time_slot_id: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled' | 'expired';
  amount: number;
  booked_at: string;
  cancelled_at: string | null;
  completed_at: string | null;
}

export interface WalletTransaction {
  id: string;
  profile_id: string;
  amount: number;
  type: 'top_up' | 'session_purchase' | 'refund' | 'bonus';
  description: string | null;
  booking_id: string | null;
  created_at: string;
}

export interface GymTrainer {
  id: string;
  gym_id: string;
  name: string;
  specialty: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface GymTimeSlot {
  id: string;
  gym_id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  is_available: boolean;
  created_at: string;
}

export interface GymPhoto {
  id: string;
  gym_id: string;
  url: string;
  caption: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface GymAmenity {
  id: string;
  gym_id: string;
  amenity_key: string;
  value?: string;
  created_at: string;
}

export interface GymSportType {
  id: string;
  gym_id: string;
  sport_type: string;
  created_at: string;
}

export interface GymEquipment {
  id: string;
  gym_id: string;
  equipment_type_id: string;
  created_at: string;
}

export interface Exercise {
  id: string;
  name_en: string;
  slug: string;
  description: string | null;
  muscle_group_id: string;
  secondary_muscle_groups: string[];
  equipment_type_id: string | null;
  exercise_type: string;
  movement_pattern: string | null;
  image_url: string | null;
  video_url: string | null;
  is_compound: boolean;
  difficulty: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ExerciseTranslation {
  id: string;
  exercise_id: string;
  locale: string;
  name: string;
  description: string | null;
  instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface MuscleGroup {
  id: string;
  name_en: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface EquipmentType {
  id: string;
  name_en: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface UserCustomExercise {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  muscle_group_id: string;
  secondary_muscle_groups: string[];
  equipment_type_id: string | null;
  exercise_type: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  name: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  status: string;
  total_volume: number;
  total_sets: number;
  estimated_calories: number;
  notes: string | null;
  gym_id: string | null;
  routine_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_session_id: string;
  exercise_id: string | null;
  custom_exercise_id: string | null;
  exercise_name: string;
  sort_order: number;
  is_superset: boolean;
  superset_group_id: string | null;
  notes: string | null;
  rest_seconds: number;
}

export interface WorkoutSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  set_type: string;
  weight_kg: number;
  reps: number;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  is_template: boolean;
  folder: string | null;
  sort_order: number;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineDay {
  id: string;
  routine_id: string;
  name: string;
  sort_order: number;
}

export interface RoutineExercise {
  id: string;
  routine_day_id: string;
  exercise_id: string | null;
  custom_exercise_id: string | null;
  exercise_name: string;
  sort_order: number;
  rest_seconds: number;
  notes: string | null;
}

export interface RoutineSet {
  id: string;
  routine_exercise_id: string;
  set_number: number;
  set_type: string;
  weight_kg: number;
  reps: number;
  rpe: number | null;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  neck_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  right_bicep_cm: number | null;
  left_bicep_cm: number | null;
  right_thigh_cm: number | null;
  left_thigh_cm: number | null;
  right_calf_cm: number | null;
  left_calf_cm: number | null;
  right_forearm_cm: number | null;
  left_forearm_cm: number | null;
  shoulders_cm: number | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface WorkoutLike {
  id: string;
  user_id: string;
  workout_session_id: string;
  created_at: string;
}

export interface WorkoutComment {
  id: string;
  user_id: string;
  workout_session_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface GymFavorite {
  id: string;
  athlete_id: string;
  gym_id: string;
  created_at: string;
}

export interface GymReview {
  id: string;
  gym_id: string;
  athlete_id: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface AthleteProfile {
  id: string;
  sport_preferences: string[] | null;
  fitness_level: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  date_of_birth: string | null;
  gender: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Translation {
  id: string;
  locale: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface Country {
  id: string;
  name_en: string;
  name_local: string;
  is_rtl: boolean;
  is_active: boolean;
  currency_code: string;
  currency_symbol: string;
  phone_prefix: string | null;
  currency_decimals: number;
  currency_display_unit: string | null;
  currency_unit_divisor: number | null;
  currency_locale: string;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  feature_key: string;
  is_enabled: boolean;
  country_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

// Input type for creating a gym — fields with DB defaults are optional
export type CreateGymInput = Omit<Gym, 'id' | 'created_at' | 'updated_at' | 'avg_rating' | 'review_count' | 'manager_id'> & {
  avg_rating?: number;
  review_count?: number;
  manager_id?: string | null;
};

// Response types for server actions
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter and sort options
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface SortOptions {
  field?: string;
  direction?: 'asc' | 'desc';
}

export interface FilterOptions {
  role?: UserRole;
  status?: string;
  search?: string;
  [key: string]: any;
}