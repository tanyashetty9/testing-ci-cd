export const mealOptedQuery = async () => {
  return `
    WITH today_optouts AS (
      SELECT user_id, meal_opted_out, opt_out_pivot_status
      FROM user_opting_pivots
      WHERE DATE(opt_out_time_from) = DATE(NOW())
    )
    SELECT 
      SUM(
        CASE 
          WHEN e.time_to_food = 'lunch' THEN 1
          WHEN e.time_to_food = 'lunch-dinner' 
              AND u.id NOT IN (
                SELECT user_id FROM today_optouts t
                WHERE t.user_id = u.id AND t.meal_opted_out = '1'
              ) THEN 1
          ELSE 0 
        END
      ) AS lunch,

      SUM(
        CASE 
          WHEN e.time_to_food = 'dinner' THEN 1
          WHEN e.time_to_food = 'lunch-dinner' 
              AND u.id NOT IN (
                SELECT user_id FROM today_optouts t
                WHERE t.user_id = u.id AND t.meal_opted_out = '2'
              ) THEN 1
          ELSE 0 
        END
      ) AS dinner

    FROM users u
    JOIN employees e ON u.employee_id = e.id
    WHERE u.is_active = 'true' 
      AND u.is_deleted = false
      AND (e.is_wfh = 'false' 
        AND u.opt_status IN ('opt-out-temp','opt-in') 
        AND u.id NOT IN (
          SELECT user_id FROM today_optouts t
          WHERE t.user_id = u.id 
            AND t.meal_opted_out = '0'
            AND t.opt_out_pivot_status = 'opt-out-temporarily'
        ))
      OR (e.is_wfh = 'true' AND u.id IN (
          SELECT user_id FROM today_optouts t
          WHERE t.user_id = u.id 
            AND t.opt_out_pivot_status = 'opt-in-temporarily'))
    ;
`;
};

export const countOfAbesenteeAndAvailed = async (flag: string) => {
  let query: string = '';
  const result =
    flag === 'availed'
      ? 'handleAvailed'
      : flag === 'absentee'
        ? 'handleAbsentee'
        : flag === 'optOutTemp'
          ? 'handleOptOutTemp'
          : '';
  switch (result) {
    case 'handleAvailed':
      query = `SELECT 
                  COUNT(CASE WHEN qr.qr_opt_status = 'Lunch' THEN 1 END) AS lunch,
                  COUNT(CASE WHEN qr.qr_opt_status = 'Dinner' THEN 1 END) AS dinner
              FROM users u
              JOIN employees e 
                  ON u.employee_id = e.id
              JOIN qr_masters qr
                  ON qr.user_id = u.id
              WHERE 
                  qr.is_scanned = true
              AND
                  qr.is_active = false
              AND 
                  DATE(qr.created_at) = :query_date
              `;
      return query;

    case 'handleAbsentee':
      query = `SELECT 
                  COUNT(CASE WHEN qr.qr_opt_status = 'Lunch' THEN 1 END) AS lunch,
                  COUNT(CASE WHEN qr.qr_opt_status = 'Dinner' THEN 1 END) AS dinner
              FROM users u
              JOIN employees e 
                  ON u.employee_id = e.id
              JOIN qr_masters qr
                  ON qr.user_id = u.id
              WHERE 
                  qr.is_scanned = false
              AND 
                  DATE(qr.created_at) = :query_date 
              `;
      return query;
    case 'handleOptOutTemp':
      query = `SELECT 
        COUNT( CASE WHEN (e.time_to_food = 'lunch' OR uop.meal_opted_out = '1') THEN 1 END) AS lunch,
        COUNT( CASE WHEN (e.time_to_food = 'dinner' OR uop.meal_opted_out = '2') THEN 1 END) AS dinner
        FROM users u
        JOIN employees e ON u.employee_id = e.id
      RIGHT JOIN user_opting_pivots uop ON uop.user_id = u.id
        WHERE 
        uop.opt_out_pivot_status = 'opt-out-temporarily'
      AND
        u.opt_status != 'opt-out-perm'
      AND
        DATE(uop.opt_out_time_from) = DATE(NOW())
      `;
      return query;
    default:
      return 'Invalid flag';
  }
};

export const dailyOptOutTemp = async () => {
  const query = `SELECT 
        e.employee_number,
        CONCAT(e.first_name,' ',e.last_name) AS "full_name",
        e.department,
        u.email,
        e.time_to_food
      FROM users u
      JOIN employees e ON u.employee_id = e.id
    RIGHT JOIN user_opting_pivots uop ON uop.user_id = u.id
      WHERE 
        ( e.time_to_food = :time_to_food OR uop.meal_opted_out = :meal_opted_out )
    AND
      u.opt_status != 'opt-out-perm'
    AND
      uop.opt_out_pivot_status = 'opt-out-temporarily'
    AND
      DATE(uop.opt_out_time_from) = DATE(NOW())
  `;
  return query;
};

export const weeklyAndMonthlyConsumedAbsentee = async () => {
  const query = `
    SELECT 
      e.employee_number,
      CONCAT(e.first_name,' ',e.last_name) AS "full_name",
      e.department,
      qr.qr_opt_status,
      DATE(qr.created_at)
    FROM 
      employees e
    JOIN
      users u
      ON e.id = u.employee_id
    LEFT JOIN
      qr_masters qr
      ON qr.user_id = u.id
    WHERE qr.is_scanned = :scan_status
    AND DATE(qr.created_at) >= :start_date
    AND DATE(qr.created_at) <= :yesterday
    ORDER BY CAST(e.employee_number AS INTEGER), qr.created_at
    `;
  return query;
};

export const weeklyAndMonthlyPermanent = async () => {
  const query = `
    SELECT 
      e.employee_number,
      CONCAT(e.first_name,' ',e.last_name) AS "full_name",
      e.department,
      INITCAP(e.time_to_food::text) AS "qr_opt_status",
      CAST(uop.opt_out_time_from AS DATE) AS "date"
    FROM 
      employees e
    JOIN
      users u
      ON e.id = u.employee_id
    LEFT JOIN
      user_opting_pivots uop
      ON uop.user_id = u.id
    WHERE 
      uop.opt_out_pivot_status = 'opt-out-permanently'
    AND
      CAST(uop.opt_out_time_to AS DATE) >= :start_date::date
    AND 
      CAST(uop.opt_out_time_from AS DATE) <= :yesterday::date
    `;
  return query;
};

export const weeklyAndMonthlyTemporary = async () => {
  const query = `
    SELECT 
      e.employee_number,
      CONCAT(e.first_name,' ',e.last_name) AS "full_name",
      e.department,
      CASE 
        WHEN uop.meal_opted_out = 1 THEN 'Lunch'
        WHEN uop.meal_opted_out = 2 THEN 'Dinner'
        WHEN uop.meal_opted_out = 0 THEN INITCAP(e.time_to_food::text)
        ELSE NULL
      END AS "qr_opt_status",
      CAST(uop.opt_out_time_from AS DATE) AS "date"
    FROM 
      employees e
    JOIN
      users u
      ON e.id = u.employee_id
    LEFT JOIN
      user_opting_pivots uop
      ON uop.user_id = u.id
    WHERE 
      uop.opt_out_pivot_status = 'opt-out-temporarily'
    AND 
      CAST(uop.opt_out_time_from AS DATE) >= :start_date::date
    AND
      CAST(uop.opt_out_time_from AS DATE) <= :yesterday::date
    ORDER BY CAST(e.employee_number AS INTEGER), uop.opt_out_time_from
`;
  return query;
};

export const weeklyAndMonthlyConsumedAbsenteePagination = async () => {
  const query = `
    SELECT 
      e.employee_number,
      CONCAT(e.first_name,' ',e.last_name) AS "full_name",
      e.department,
      qr.qr_opt_status,
      DATE(qr.created_at)
    FROM 
      employees e
    JOIN
      users u
      ON e.id = u.employee_id
    LEFT JOIN
      qr_masters qr
      ON qr.user_id = u.id
    WHERE qr.is_scanned = :scan_status
    AND DATE(qr.created_at) >= :start_date
    AND DATE(qr.created_at) <= :yesterday
    ORDER BY CAST(e.employee_number AS INTEGER), qr.created_at
    LIMIT :limit OFFSET :offset;
    `;
  return query;
};

export const weeklyAndMonthlyPermanentPagination = async () => {
  const query = `
    SELECT 
      e.employee_number,
      CONCAT(e.first_name,' ',e.last_name) AS "full_name",
      e.department,
      INITCAP(e.time_to_food::text) AS "qr_opt_status",
      CAST(uop.opt_out_time_from AS DATE) AS "date"
    FROM 
      employees e
    JOIN
      users u
      ON e.id = u.employee_id
    LEFT JOIN
      user_opting_pivots uop
      ON uop.user_id = u.id
    WHERE 
      uop.opt_out_pivot_status = 'opt-out-permanently'
    AND
      CAST(uop.opt_out_time_to AS DATE) >= :start_date::date
    AND 
      CAST(uop.opt_out_time_from AS DATE) <= :yesterday::date
    LIMIT :limit OFFSET :offset;
    `;
  return query;
};

export const weeklyAndMonthlyTemporaryPagination = async () => {
  const query = `
    SELECT 
      e.employee_number,
      CONCAT(e.first_name,' ',e.last_name) AS "full_name",
      e.department,
      CASE 
        WHEN uop.meal_opted_out = 1 THEN 'Lunch'
        WHEN uop.meal_opted_out = 2 THEN 'Dinner'
        WHEN uop.meal_opted_out = 0 THEN INITCAP(e.time_to_food::text)
        ELSE NULL
      END AS "qr_opt_status",
      CAST(uop.opt_out_time_from AS DATE) AS "date"
    FROM 
      employees e
    JOIN
      users u
      ON e.id = u.employee_id
    LEFT JOIN
      user_opting_pivots uop
      ON uop.user_id = u.id
    WHERE 
      uop.opt_out_pivot_status = 'opt-out-temporarily'
    AND 
      CAST(uop.opt_out_time_from AS DATE) >= :start_date::date
    AND
      CAST(uop.opt_out_time_from AS DATE) <= :yesterday::date
    ORDER BY CAST(e.employee_number AS INTEGER), uop.opt_out_time_from
    LIMIT :limit OFFSET :offset;
`;
  return query;
};
export const detailedMealQuery = async (flag: string) => {
  let query: string = '';
  if (flag === 'mealedOpted') {
    query = `
      WITH data_today AS (
        SELECT user_id, opt_out_pivot_status, meal_opted_out
        FROM user_opting_pivots
        WHERE DATE(opt_out_time_from) = DATE(NOW())
      )
      SELECT 
        e.employee_number,
        CONCAT(e.first_name,' ',e.last_name) AS full_name,
        e.department,
        u.email,
        e.time_to_food
          FROM users u
          JOIN employees e ON u.employee_id = e.id
            WHERE 
              e.time_to_food IN(:time_to_food , 'lunch-dinner') AND
              u.is_active = true AND
              u.is_deleted = false AND
              (e.is_wfh = 'false' 
                AND u.opt_status IN ('opt-out-temp','opt-in') 
                AND u.id NOT IN (
                  SELECT t.user_id FROM data_today t
                    WHERE t.opt_out_pivot_status = 'opt-out-temporarily'
                    AND t.meal_opted_out IN (:meal_out,'0'))) 
              OR (e.is_wfh = 'true' 
                AND e.time_to_food = :time_to_food 
                AND u.id IN(
                  SELECT t.user_id FROM data_today t
                    WHERE t.opt_out_pivot_status = 'opt-in-temporarily'))
    `;
  } else if (flag === 'absentee') {
    query = `SELECT 
    CONCAT(
      COALESCE(e.first_name, ''),
      CASE 
        WHEN e.middle_name IS NOT NULL AND e.middle_name != '' THEN CONCAT(' ', e.middle_name) 
        ELSE '' 
      END,
      CASE 
        WHEN e.last_name IS NOT NULL AND e.last_name != '' THEN CONCAT(' ', e.last_name) 
          ELSE '' 
        END
    ) AS full_name,
      e.employee_number,
      u.email,
      e.department,
      e.time_to_food 
    FROM users u
    JOIN employees e 
      ON u.employee_id = e.id
    JOIN qr_masters qr
      ON qr.user_id = u.id
    WHERE 
      LOWER(qr.qr_opt_status) = :time_to_food AND
      qr.is_scanned = false AND 
      DATE(qr.created_at) = :query_date ;`;
  } else if (flag === 'availed') {
    query = `SELECT 
      CONCAT(
        COALESCE(e.first_name, ''),
          CASE 
            WHEN e.middle_name IS NOT NULL AND e.middle_name != '' THEN CONCAT(' ', e.middle_name) 
              ELSE '' 
          END,
          CASE 
            WHEN e.last_name IS NOT NULL AND e.last_name != '' THEN CONCAT(' ', e.last_name) 
              ELSE '' 
          END
        ) AS full_name,
        e.employee_number,
        u.email,
        e.department,
        e.time_to_food 
      FROM users u
      JOIN employees e ON u.employee_id = e.id
      JOIN qr_masters qr ON qr.user_id = u.id
      WHERE 
        qr.is_scanned = true
        AND LOWER(qr.qr_opt_status) = :time_to_food
        AND qr.is_active = false
        AND DATE(qr.created_at) = :query_date;`;
  }
  return query;
};
