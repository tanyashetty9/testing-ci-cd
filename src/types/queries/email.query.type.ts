export const AbsenteeEmployCount = (period: string): string => {
  let query: string;
  if (period === 'weekly') {
    query = `SELECT
            e.id AS employee_id, 
            u.id AS user_id,
            e.employee_number,
            e.time_to_food,
            u.email,
            u.absent_warning_counter,
            u.is_deleted,
            CONCAT(e.first_name, ' ', e.last_name) AS full_name,
            COUNT(qr.user_id) AS absent_count
        FROM users u 
        JOIN employees e ON e.id = u.employee_id
        JOIN qr_masters qr ON u.id = qr.user_id
        WHERE qr.is_scanned = false
            AND qr.is_active = false
            AND (e.is_wfh = true
              OR
              (e.is_wfh = false and u.opt_status != 'opt-out-perm')
            )
            AND qr.created_at >= NOW() - INTERVAL '5 days'
        GROUP BY e.id, u.id, u.email, e.first_name, e.last_name
        `;
  } else {
    query = `SELECT 
            e.id AS employee_id, 
            u.id AS user_id,
            e.employee_number,
            e.time_to_food,
            u.email,
            u.absent_warning_counter,
            u.is_deleted,
            CONCAT(e.first_name, ' ', e.last_name) AS full_name,
            COUNT(qr.user_id) AS absent_count
        FROM users u 
        JOIN employees e ON e.id = u.employee_id
        JOIN qr_masters qr ON u.id = qr.user_id
        WHERE qr.is_scanned = false
          AND qr.is_active = false
          AND (e.is_wfh = true
				    OR
				    (e.is_wfh = false and u.opt_status != 'opt-out-perm')
			    )
          AND qr.created_at >= NOW() - INTERVAL '28 days'
        GROUP BY e.id, u.id, u.email, e.first_name, e.last_name
        `;
  }
  return query;
};
