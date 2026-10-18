package repo

import (
	"fmt"
	"strings"
)

// query memisahkan penyusunan kueri dari penyusunan argumen. Kueri yang punya
// banyak filter opsional jadi satu tempat penomoran $1..$n, tidak tersebar
// di tiap percabangan.
type query struct {
	conditions []string
	args       []any
}

func newQuery() *query { return &query{} }

// where menambahkan kondisi. Setiap %s diisi satu parameter berurutan.
func (q *query) where(format string, values ...any) {
	placeholders := make([]any, 0, len(values))
	for _, v := range values {
		q.args = append(q.args, v)
		placeholders = append(placeholders, "$"+fmt.Sprint(len(q.args)))
	}
	q.conditions = append(q.conditions, fmt.Sprintf(format, placeholders...))
}

func (q *query) clause() string {
	if len(q.conditions) == 0 {
		return ""
	}
	return " where " + strings.Join(q.conditions, " and ")
}

func (q *query) paging(limit, offset int) string {
	var b strings.Builder
	if limit > 0 {
		q.args = append(q.args, limit)
		fmt.Fprintf(&b, " limit $%d", len(q.args))
	}
	if offset > 0 {
		q.args = append(q.args, offset)
		fmt.Fprintf(&b, " offset $%d", len(q.args))
	}
	return b.String()
}
