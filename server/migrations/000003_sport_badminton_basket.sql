-- Dua cabang baru: badminton dan basket. Komunitas tidak lagi menyimpan cabang
-- (lihat 000002), jadi hanya jadwal sesi dan rating pemain yang dibatasi.
alter table events drop constraint events_sport_check;
alter table events add constraint events_sport_check
    check (sport in ('padel', 'tennis', 'badminton', 'basket'));

alter table player_ratings drop constraint player_ratings_sport_check;
alter table player_ratings add constraint player_ratings_sport_check
    check (sport in ('padel', 'tennis', 'badminton', 'basket'));
