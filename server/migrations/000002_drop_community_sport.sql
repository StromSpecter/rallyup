-- Komunitas tidak lagi terikat satu cabang olahraga; cabang dipilih per sesi.
alter table communities drop column if exists sport;
