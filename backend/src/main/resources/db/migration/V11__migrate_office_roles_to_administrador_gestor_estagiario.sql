-- Migra cargos legados para o novo modelo de 3 papeis.
UPDATE office_users
SET role = CASE role
    WHEN 'ADMIN' THEN 'ADMINISTRADOR'
    WHEN 'LAWYER' THEN 'GESTOR'
    WHEN 'ASSISTANT' THEN 'GESTOR'
    WHEN 'VIEWER' THEN 'ESTAGIARIO'
    ELSE role
END
WHERE role IN ('ADMIN', 'LAWYER', 'ASSISTANT', 'VIEWER');
