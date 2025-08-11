export interface User {
  id: string | null;
  employee_id: string | null;
  email: string | null;
  password: string | null;
  confirmPassword: string | null;
  hashedPassword: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  is_deleted: boolean | null;
  access_token: string | null;
  role: string | null;
  link: string | null;
  linkExpiry: Date | null;
  is_active: boolean | null;
  start_date: Date | null;
  end_date: Date | null;
  opt_status: 'opt-in' | 'opt-out-temp' | 'opt-out-perm' | null;
  counter: number | null;
  opt_out_date: Date | null;
  flag: string | null;
  is_admin: boolean | null;
  opt_out_notif_status: 'approved' | 'pending' | 'rejected' | null;
}

export interface Employee {
  id: string | null;
  full_name: string | null;
  employee_number: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  department: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  email: string | null;
  role: string | null;
  time_to_food:
    | 'lunch'
    | 'dinner'
    | 'Lunch'
    | 'Dinner'
    | 'Lunch And Dinner'
    | 'lunch-dinner'
    | null;
  is_deleted: boolean | null;
  opt_status: string | null;
  is_active: boolean | null;
  user_id: string | null;
  employee_id: string | null;
  is_wfh: boolean | null;
  user_details: {
    first_name: string | null;
    last_name: string | null;
    full_name: string | null;
    employee_number: string | null;
    time_to_food:
      | 'lunch'
      | 'dinner'
      | 'Lunch'
      | 'Dinner'
      | 'Lunch And Dinner'
      | null;
    opt_status: string | null;
    department: string | null;
    middle_name: string | null;
    is_active: boolean | null;
    is_deleted: boolean | null;
    created_at: Date | null;
    updated_at: Date | null;
    user_id: string | null;
  };
}

export interface QRCodeData {
  status: string;
  optOutDateFrom: string;
  optOutDateTo: string;
  isScanned: boolean;
  isActive: boolean;
  timeToFood: string;
}

export interface OptOutData {
  id: string;
  opt_out_time_from: string;
  opt_out_time_to: string;
  meal_opted_out: number | 0;
}

export interface Department {
  id: string | null;
  department_name: string | null;
  is_deleted: boolean | null;
}

export interface CountedEmployee {
  employee_id: string;
  user_id: string;
  employee_number: string | null;
  email: string | null;
  full_name: string | null;
  absent_count: number | null;
  absent_warning_counter: number | null;
  is_deleted: boolean | null;
  time_to_food: string | null;
}

export interface MailBody {
  username?: string;
  link?: string;
  full_name?: string;
  employee_number?: string;
  time_to_food?: string;
  absent_count?: number;
  period?: string;
  content_finish?: string;
  content_start?: string;
}
