INSERT INTO aircraft_numbers (aircraft_id, number)
SELECT aircraft.id, (SELECT COUNT(*) FROM aircraft AS earlier WHERE earlier.base_id = aircraft.base_id AND earlier.id <= aircraft.id)
FROM aircraft
LEFT JOIN aircraft_numbers ON aircraft_numbers.aircraft_id = aircraft.id
WHERE aircraft_numbers.aircraft_id IS NULL
