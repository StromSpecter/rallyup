package domain

import "errors"

// Seluruh error yang boleh bocor ke handler punya pasangan status HTTP,
// supaya layer handler tidak menebak-nebak jenis kegagalan.
var (
	ErrNotFound     = errors.New("data tidak ditemukan")
	ErrConflict     = errors.New("data sudah ada")
	ErrUnauthorized = errors.New("kredensial tidak valid")
	ErrForbidden    = errors.New("anda tidak punya akses")
	ErrInvalid      = errors.New("data tidak valid")
	ErrFull         = errors.New("slot sudah penuh")
	ErrInvalidState = errors.New("status saat ini tidak mengizinkan aksi ini")
)
