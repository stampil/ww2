INSERT INTO mechanics (base_id, skill)
SELECT bases.id, 40 FROM bases CROSS JOIN (SELECT 1 AS number UNION ALL SELECT 2) AS pair
WHERE NOT EXISTS (SELECT 1 FROM mechanics WHERE mechanics.base_id = bases.id)
