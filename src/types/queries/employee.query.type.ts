export const getEmployeeAbsentCountQuery = (period: string) => {
  let query;
  if (period === 'monthly') {
    query = `WITH user_data AS (
      SELECT u.id AS user_id, e.id AS emp_id, 
      CONCAT(
        COALESCE(e.first_name, ''),
        CASE WHEN e.middle_name IS NOT NULL AND e.middle_name != '' THEN CONCAT(' ', e.middle_name) ELSE '' END,
        CASE WHEN e.last_name IS NOT NULL AND e.last_name != '' THEN CONCAT(' ', e.last_name) ELSE '' END
      ) AS full_name,
      e.employee_number,
      CASE WHEN e.time_to_food = 'lunch' THEN 'Lunch'
        WHEN e.time_to_food = 'dinner' THEN 'Dinner'
        ELSE 'Lunch and Dinner'
      END AS time_to_food
      FROM employees e
      JOIN users u ON e.id = u.employee_id
      WHERE e.is_deleted = false AND e.id = :employeeId
    ),
    
    qr_data AS (
      SELECT
      qr.created_at::DATE AS date,
      qr.is_scanned,
      qr.qr_opt_status AS meal_opted
      FROM qr_masters qr
      JOIN user_data ud ON ud.user_id = qr.user_id
      WHERE EXTRACT(DOW FROM qr.created_at) NOT IN (0, 6)
    ),
    
    opt_out_data AS (
      SELECT
      gs.gen_time::DATE AS date,
      uop.opt_out_pivot_status
      FROM user_opting_pivots uop
      JOIN user_data ud ON ud.user_id = uop.user_id
      JOIN LATERAL generate_series(
      uop.opt_out_time_from::DATE,
      GREATEST(uop.opt_out_time_from::DATE, LEAST(uop.opt_out_time_to::DATE - INTERVAL '1 day', NOW()::DATE)),
      interval '1 day'
      ) AS gs(gen_time) ON true
      WHERE uop.is_active = true
      AND uop.is_admin_approved = 'approved'
      AND EXTRACT(DOW FROM gs.gen_time) NOT IN (0, 6) 
    ),
    
    relevant_dates AS (
        SELECT date FROM qr_data
        WHERE date >= DATE(NOW()) - INTERVAL '30 days'

        UNION

        SELECT date FROM opt_out_data
        WHERE date >= DATE(NOW()) - INTERVAL '30 days'
        AND date NOT IN (SELECT date FROM qr_data)
    )

    
    SELECT
      ud.full_name,
      ud.employee_number,
      ud.time_to_food,
      rd.date,
      COALESCE(qr.meal_opted, 'no data') AS meal_opted,
      CASE
      WHEN qr.is_scanned IS TRUE THEN 'consumed'
      WHEN opt.opt_out_pivot_status = 'opt-out-permanently' THEN 'Opted out permanently'
      WHEN opt.opt_out_pivot_status = 'opt-out-temporarily' THEN 'Temporarily opted out'
      WHEN qr.date IS NOT NULL AND qr.is_scanned IS FALSE THEN 'Not consumed'
      ELSE 'No data'
      END AS status,
      CASE
      WHEN qr.is_scanned IS TRUE THEN 'Scanner Success'
      WHEN opt.opt_out_pivot_status = 'opt-out-permanently' THEN 'Scanner Failed'
      WHEN opt.opt_out_pivot_status = 'opt-out-temporarily' THEN 'Scanner Failed'
      WHEN qr.date IS NOT NULL AND qr.is_scanned IS FALSE THEN 'Scanner Failed'
      ELSE 'No scan'
      END AS scanner_status
    FROM user_data ud
    LEFT JOIN relevant_dates rd ON true
    LEFT JOIN qr_data qr ON rd.date = qr.date
    LEFT JOIN opt_out_data opt ON rd.date = opt.date
    ORDER BY rd.date DESC`;
  } else if (period === 'weekly') {
    query = `WITH user_data AS (
      SELECT u.id AS user_id, e.id AS emp_id, 
      CONCAT(
        COALESCE(e.first_name, ''),
        CASE WHEN e.middle_name IS NOT NULL AND e.middle_name != '' THEN CONCAT(' ', e.middle_name) ELSE '' END,
        CASE WHEN e.last_name IS NOT NULL AND e.last_name != '' THEN CONCAT(' ', e.last_name) ELSE '' END
      ) AS full_name,
      e.employee_number,
      CASE WHEN e.time_to_food = 'lunch' THEN 'Lunch'
        WHEN e.time_to_food = 'dinner' THEN 'Dinner'
        ELSE 'Lunch and Dinner'
      END AS time_to_food
      FROM employees e
      JOIN users u ON e.id = u.employee_id
      WHERE e.is_deleted = false AND e.id = :employeeId
    ),
    
    qr_data AS (
      SELECT
      qr.created_at::DATE AS date,
      qr.is_scanned,
      qr.qr_opt_status AS meal_opted
      FROM qr_masters qr
      JOIN user_data ud ON ud.user_id = qr.user_id
      WHERE EXTRACT(DOW FROM qr.created_at) NOT IN (0, 6)
    ),
    
    opt_out_data AS (
      SELECT
      gs.gen_time::DATE AS date,
      uop.opt_out_pivot_status
      FROM user_opting_pivots uop
      JOIN user_data ud ON ud.user_id = uop.user_id
      JOIN LATERAL generate_series(
      uop.opt_out_time_from::DATE,
      GREATEST(uop.opt_out_time_from::DATE, LEAST(uop.opt_out_time_to::DATE - INTERVAL '1 day', NOW()::DATE)),
      interval '1 day'
      ) AS gs(gen_time) ON true
      WHERE uop.is_active = true
      AND uop.is_admin_approved = 'approved'
      AND EXTRACT(DOW FROM gs.gen_time) NOT IN (0, 6) 
    ),
    
    relevant_dates AS (
        SELECT date FROM qr_data
        WHERE date >= DATE(NOW()) - INTERVAL '9 days'

        UNION

        SELECT date FROM opt_out_data
        WHERE date >= DATE(NOW()) - INTERVAL '9 days'
        AND date NOT IN (SELECT date FROM qr_data)
    )

    
    SELECT
      ud.full_name,
      ud.employee_number,
      ud.time_to_food,
      rd.date,
      COALESCE(qr.meal_opted, 'no data') AS meal_opted,
      CASE
      WHEN qr.is_scanned IS TRUE THEN 'consumed'
      WHEN opt.opt_out_pivot_status = 'opt-out-permanently' THEN 'Opted out permanently'
      WHEN opt.opt_out_pivot_status = 'opt-out-temporarily' THEN 'Temporarily opted out'
      WHEN qr.date IS NOT NULL AND qr.is_scanned IS FALSE THEN 'Not consumed'
      ELSE 'No data'
      END AS status,
      CASE
      WHEN qr.is_scanned IS TRUE THEN 'Scanner Success'
      WHEN opt.opt_out_pivot_status = 'opt-out-permanently' THEN 'Scanner Failed'
      WHEN opt.opt_out_pivot_status = 'opt-out-temporarily' THEN 'Scanner Failed'
      WHEN qr.date IS NOT NULL AND qr.is_scanned IS FALSE THEN 'Scanner Failed'
      ELSE 'No scan'
      END AS scanner_status
    FROM user_data ud
    LEFT JOIN relevant_dates rd ON true
    LEFT JOIN qr_data qr ON rd.date = qr.date
    LEFT JOIN opt_out_data opt ON rd.date = opt.date
    ORDER BY rd.date DESC`;
  } else {
    query = `WITH user_data AS (
      SELECT u.id AS user_id, e.id AS emp_id, 
      CONCAT(
        COALESCE(e.first_name, ''),
        CASE WHEN e.middle_name IS NOT NULL AND e.middle_name != '' THEN CONCAT(' ', e.middle_name) ELSE '' END,
        CASE WHEN e.last_name IS NOT NULL AND e.last_name != '' THEN CONCAT(' ', e.last_name) ELSE '' END
      ) AS full_name,
      e.employee_number,
      CASE WHEN e.time_to_food = 'lunch' THEN 'Lunch'
        WHEN e.time_to_food = 'dinner' THEN 'Dinner'
        ELSE 'Lunch and Dinner'
      END AS time_to_food
      FROM employees e
      JOIN users u ON e.id = u.employee_id
      WHERE e.is_deleted = false AND e.id = :employeeId
    ),
    
    qr_data AS (
      SELECT
      qr.created_at::DATE AS date,
      qr.is_scanned,
      qr.qr_opt_status AS meal_opted
      FROM qr_masters qr
      JOIN user_data ud ON ud.user_id = qr.user_id
      WHERE EXTRACT(DOW FROM qr.created_at) NOT IN (0, 6)
    ),
    
    opt_out_data AS (
      SELECT
      gs.gen_time::DATE AS date,
      uop.opt_out_pivot_status
      FROM user_opting_pivots uop
      JOIN user_data ud ON ud.user_id = uop.user_id
      JOIN LATERAL generate_series(
      uop.opt_out_time_from::DATE,
      GREATEST(uop.opt_out_time_from::DATE, LEAST(uop.opt_out_time_to::DATE - INTERVAL '1 day', NOW()::DATE)),
      interval '1 day'
      ) AS gs(gen_time) ON true
      WHERE uop.is_active = true
      AND uop.is_admin_approved = 'approved'
      AND EXTRACT(DOW FROM gs.gen_time) NOT IN (0, 6) 
    ),
    
    relevant_dates AS (
      SELECT date FROM qr_data
      UNION
      SELECT date FROM opt_out_data
      WHERE date NOT IN (SELECT date FROM qr_data)
    )
    
    SELECT
      ud.full_name,
      ud.employee_number,
      ud.time_to_food,
      rd.date,
      COALESCE(qr.meal_opted, 'no data') AS meal_opted,
      CASE
      WHEN qr.is_scanned IS TRUE THEN 'consumed'
      WHEN opt.opt_out_pivot_status = 'opt-out-permanently' THEN 'Opted out permanently'
      WHEN opt.opt_out_pivot_status = 'opt-out-temporarily' THEN 'Temporarily opted out'
      WHEN qr.date IS NOT NULL AND qr.is_scanned IS FALSE THEN 'Not consumed'
      ELSE 'No data'
      END AS status,
      CASE
      WHEN qr.is_scanned IS TRUE THEN 'Scanner Success'
      WHEN opt.opt_out_pivot_status = 'opt-out-permanently' THEN 'Scanner Failed'
      WHEN opt.opt_out_pivot_status = 'opt-out-temporarily' THEN 'Scanner Failed'
      WHEN qr.date IS NOT NULL AND qr.is_scanned IS FALSE THEN 'Scanner Failed'
      ELSE 'No scan'
      END AS scanner_status
    FROM user_data ud
    LEFT JOIN relevant_dates rd ON true
    LEFT JOIN qr_data qr ON rd.date = qr.date
    LEFT JOIN opt_out_data opt ON rd.date = opt.date
    ORDER BY rd.date DESC`;
  }
  return query;
};
