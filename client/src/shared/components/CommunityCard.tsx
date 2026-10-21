import { Link } from 'react-router-dom'

import type { Community } from '@/shared/types/api'

export function CommunityCard({ community }: { community: Community }) {
  return (
    <article className="group relative flex h-full flex-col gap-3 rounded-sm border border-border bg-card p-5 transition-colors hover:border-primary">
      <div className="flex items-center justify-end gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {community.memberCount} anggota
        </span>
      </div>
      <h3 className="font-display text-lg leading-tight uppercase">
        <Link to={`/komunitas/${community.slug}`} className="after:absolute after:inset-0">
          {community.name}
        </Link>
      </h3>
      <p className="text-sm text-muted-foreground">{community.city}</p>
      {community.description ? (
        <p className="line-clamp-3 text-sm text-muted-foreground">{community.description}</p>
      ) : null}
    </article>
  )
}
