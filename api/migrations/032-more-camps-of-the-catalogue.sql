INSERT INTO bases (instance_id, site, plan)
SELECT instances.id, camps.site, 'start'
FROM instances
CROSS JOIN (
    SELECT 'salon' AS site
    UNION ALL SELECT 'montdemarsan'
    UNION ALL SELECT 'caen'
    UNION ALL SELECT 'bordeaux'
    UNION ALL SELECT 'toulouse'
    UNION ALL SELECT 'cambrai'
    UNION ALL SELECT 'tours'
    UNION ALL SELECT 'melun'
    UNION ALL SELECT 'lebourget'
    UNION ALL SELECT 'orange'
    UNION ALL SELECT 'cazaux'
    UNION ALL SELECT 'chartres'
    UNION ALL SELECT 'lanveoc'
    UNION ALL SELECT 'evere'
    UNION ALL SELECT 'fuerstenfeldbruck'
    UNION ALL SELECT 'memmingen'
    UNION ALL SELECT 'illesheim'
    UNION ALL SELECT 'pferdsfeld'
    UNION ALL SELECT 'pisa'
    UNION ALL SELECT 'turin'
) AS camps
WHERE NOT EXISTS (SELECT 1 FROM bases WHERE bases.instance_id = instances.id AND bases.site = camps.site)
