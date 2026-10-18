package service

import (
	"hash/fnv"
)

// avatarPalette adalah palet tetap untuk avatar inisial. Placeholder ini
// dipakai selama pemain belum punya foto sendiri.
var avatarPalette = []string{
	"#0E4D3A",
	"#8A5A00",
	"#1F3A5F",
	"#6B2D3C",
	"#3F4A0E",
	"#4A2C5E",
}

// AvatarColor memberi warna stabil untuk sebuah nama, sehingga orang yang sama
// selalu tampil dengan warna yang sama.
func AvatarColor(seed string) string {
	h := fnv.New32a()
	_, _ = h.Write([]byte(seed))
	return avatarPalette[int(h.Sum32())%len(avatarPalette)]
}
