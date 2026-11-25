INSERT INTO aircraft_commissions (aircraft_id, commissioned_epoch)
SELECT aircraft.id, UNIX_TIMESTAMP() FROM aircraft
LEFT JOIN aircraft_commissions ON aircraft_commissions.aircraft_id = aircraft.id
WHERE aircraft_commissions.aircraft_id IS NULL
