// Runner migrasi tanpa dependensi eksternal.
//
// Nama berkas: NNNNNN_nama.sql, diterapkan berurutan berdasarkan angka di depan.
// Perubahan yang sudah berjalan dicatat di schema_migrations, jadi aman
// dijalankan berulang. Tidak ada file down: perubahan skema di proyek ini
// lewat penambahan berkas baru, supaya riwayat skema tetap terbaca.
package main

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var namePattern = regexp.MustCompile(`^(\d{6})_.*\.sql$`)

type migration struct {
	version int
	name    string
	body    string
}

func main() {
	reset := contains(os.Args[1:], "-reset")

	dsn := os.Getenv("RALLYUP_DATABASE_URL")
	if dsn == "" {
		fmt.Fprintln(os.Stderr, "RALLYUP_DATABASE_URL kosong")
		os.Exit(1)
	}

	dir := envOr("RALLYUP_MIGRATIONS_DIR", "migrations")
	if _, err := os.Stat(dir); err != nil {
		fmt.Fprintf(os.Stderr, "folder migrasi %q tidak ditemukan; jalankan dari folder server/\n", dir)
		os.Exit(1)
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		fail(err)
	}
	defer db.Close()

	ctx := context.Background()
	if err := db.PingContext(ctx); err != nil {
		fail(fmt.Errorf("database tidak terjangkau: %w", err))
	}

	if reset {
		if _, err := db.ExecContext(ctx, "drop schema if exists public cascade; create schema public;"); err != nil {
			fail(err)
		}
		fmt.Println("skema dihapus, dibuat ulang dari nol")
	}

	if _, err := db.ExecContext(ctx, `create table if not exists schema_migrations (
		version int primary key,
		name text not null,
		applied_at timestamptz not null default now()
	)`); err != nil {
		fail(err)
	}

	migrations, err := load(os.DirFS(dir))
	if err != nil {
		fail(err)
	}

	applied := map[int]bool{}
	rows, err := db.QueryContext(ctx, "select version from schema_migrations")
	if err != nil {
		fail(err)
	}
	for rows.Next() {
		var v int
		if err := rows.Scan(&v); err != nil {
			rows.Close()
			fail(err)
		}
		applied[v] = true
	}
	rows.Close()

	ran := 0
	for _, m := range migrations {
		if applied[m.version] {
			continue
		}
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			fail(err)
		}
		if _, err := tx.ExecContext(ctx, m.body); err != nil {
			tx.Rollback()
			fail(fmt.Errorf("%s gagal: %w", m.name, err))
		}
		if _, err := tx.ExecContext(ctx,
			"insert into schema_migrations (version, name) values ($1, $2)", m.version, m.name); err != nil {
			tx.Rollback()
			fail(err)
		}
		if err := tx.Commit(); err != nil {
			fail(err)
		}
		fmt.Printf("menerapkan %s\n", m.name)
		ran++
	}

	if ran == 0 {
		fmt.Println("tidak ada migrasi baru")
	} else {
		fmt.Printf("%d migrasi diterapkan\n", ran)
	}
}

func load(fsys fs.FS) ([]migration, error) {
	entries, err := fs.ReadDir(fsys, ".")
	if err != nil {
		return nil, err
	}

	var out []migration
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		match := namePattern.FindStringSubmatch(e.Name())
		if match == nil {
			if strings.HasSuffix(e.Name(), ".sql") {
				return nil, fmt.Errorf("nama berkas migrasi harus NNNNNN_nama.sql: %s", e.Name())
			}
			continue
		}
		version, err := strconv.Atoi(match[1])
		if err != nil {
			return nil, err
		}
		body, err := fs.ReadFile(fsys, filepath.Clean(e.Name()))
		if err != nil {
			return nil, err
		}
		out = append(out, migration{version: version, name: e.Name(), body: string(body)})
	}

	sort.Slice(out, func(i, j int) bool { return out[i].version < out[j].version })
	return out, nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func contains(args []string, target string) bool {
	for _, a := range args {
		if a == target {
			return true
		}
	}
	return false
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
