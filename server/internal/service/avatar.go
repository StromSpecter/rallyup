package service

import (
	"hash/fnv"
)

// avatarPalette adalah palet tetap untuk avatar inisial. Placeholder ini
// dipakai selama pemain belum punya foto sendiri.
var avatarPalette = []string{
	"#174BE0",
	"#101B30",
	"#0E5A6B",
	"#6B2D3C",
	"#4A2C5E",
	"#5C4A00",
}

// AvatarColor memberi warna stabil untuk sebuah nama, sehingga orang yang sama
// selalu tampil dengan warna yang sama.
func AvatarColor(seed string) string {
	h := fnv.New32a()
	_, _ = h.Write([]byte(seed))
	return avatarPalette[int(h.Sum32())%len(avatarPalette)]
}
