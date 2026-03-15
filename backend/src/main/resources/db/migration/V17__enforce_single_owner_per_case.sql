CREATE UNIQUE INDEX uq_case_members_single_owner
ON case_members (case_id)
WHERE permission = 'OWNER';
