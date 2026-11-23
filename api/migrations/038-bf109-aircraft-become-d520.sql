UPDATE aircraft
SET model_id = (SELECT id FROM aircraft_models WHERE code = 'd520')
WHERE model_id = (SELECT id FROM aircraft_models WHERE code = 'bf109')
