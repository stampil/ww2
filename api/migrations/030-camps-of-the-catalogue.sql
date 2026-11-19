INSERT INTO bases (instance_id, site, plan)
SELECT instances.id, camps.site, 'start'
FROM instances
CROSS JOIN (
    SELECT 'lille' AS site UNION ALL SELECT 'reims' UNION ALL SELECT 'metz' UNION ALL SELECT 'nancy' UNION ALL SELECT 'dijon' UNION ALL SELECT 'orleans'
    UNION ALL SELECT 'villacoublay' UNION ALL SELECT 'saintdizier' UNION ALL SELECT 'luxeuil' UNION ALL SELECT 'avord'
    UNION ALL SELECT 'essen' UNION ALL SELECT 'koeln' UNION ALL SELECT 'mainz' UNION ALL SELECT 'frankfurt' UNION ALL SELECT 'mannheim'
    UNION ALL SELECT 'badenoos' UNION ALL SELECT 'stuttgart' UNION ALL SELECT 'lechfeld' UNION ALL SELECT 'muenchen' UNION ALL SELECT 'bonn'
) AS camps
WHERE NOT EXISTS (SELECT 1 FROM bases WHERE bases.instance_id = instances.id AND bases.site = camps.site)
