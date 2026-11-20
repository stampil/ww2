INSERT IGNORE INTO aircraft_liveries (aircraft_id, livery)
SELECT aircraft.id, 'french'
FROM aircraft
LEFT JOIN aircraft_liveries ON aircraft_liveries.aircraft_id = aircraft.id
WHERE aircraft_liveries.aircraft_id IS NULL
