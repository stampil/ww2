INSERT INTO pilot_assignments (pilot_id, base_id, assigned_epoch)
SELECT pilots.id, pilots.base_id, UNIX_TIMESTAMP() FROM pilots
WHERE NOT EXISTS (SELECT 1 FROM pilot_assignments WHERE pilot_assignments.pilot_id = pilots.id)
