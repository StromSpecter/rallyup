import { FiLogOut, FiMenu, FiUser, FiGrid } from 'react-icons/fi'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/auth'
import { Container } from '@/shared/components/Container'
import { RallyUpMark } from '@/shared/components/Marks'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { Avatar } from '@/shared/components/Avatar'
import { Button } from '@/shared/components/ui/button'
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from '@/shared/components/ui/dropdown'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'

const PUBLIC_NAV = [
  { to: '/', label: 'Beranda', end: true },
  { to: '/komunitas', label: 'Komunitas', end: false },
  { to: '/sesi', label: 'Sesi', end: false },
  { to: '/peringkat', label: 'Peringkat', end: false },
]

function navClass({ isActive }: { isActive: boolean }) {
  return [
    'rounded-sm px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
  ].join(' ')
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Lewati ke konten
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <RallyUpMark className="size-8" />
            <span className="font-display text-base tracking-wide uppercase">RallyUp</span>
          </Link>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
            {PUBLIC_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <NavLink to="/app" className={navClass}>
                Dashboard
              </NavLink>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {user ? (
              <div className="hidden items-center gap-2 md:flex">
                <NotificationBell />
                <Dropdown>
                  <DropdownTrigger
                    className="inline-flex items-center gap-2 rounded-md border border-border py-1 pr-2 pl-1 transition-colors hover:bg-accent"
                    aria-label="Menu akun"
                  >
                    <Avatar name={user.name} color={user.avatarColor} size="sm" />
                    <span className="max-w-28 truncate text-sm font-medium">{user.name}</span>
                  </DropdownTrigger>
                  <DropdownContent>
                    <DropdownLabel>{user.email}</DropdownLabel>
                    <DropdownSeparator />
                    <DropdownItem onSelect={() => navigate('/app')}>
                      <FiGrid aria-hidden="true" />
                      Dashboard
                    </DropdownItem>
                    <DropdownItem onSelect={() => navigate('/app/profil')}>
                      <FiUser aria-hidden="true" />
                      Profil
                    </DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem onSelect={() => void handleSignOut()}>
                      <FiLogOut aria-hidden="true" />
                      Keluar
                    </DropdownItem>
                  </DropdownContent>
                </Dropdown>
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/masuk">Masuk</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/daftar">Daftar</Link>
                </Button>
              </div>
            )}

            <Sheet>
              <SheetTrigger
                className="inline-flex size-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-accent md:hidden"
                aria-label="Buka menu"
              >
                <FiMenu aria-hidden="true" className="size-4" />
              </SheetTrigger>
              <SheetContent side="right" aria-label="Menu">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav aria-label="Navigasi" className="flex flex-col gap-1">
                  {PUBLIC_NAV.map((item) => (
                    <SheetClose asChild key={item.to}>
                      <NavLink to={item.to} end={item.end} className={navClass}>
                        {item.label}
                      </NavLink>
                    </SheetClose>
                  ))}
                  {user ? (
                    <>
                      <SheetClose asChild>
                        <NavLink to="/app" className={navClass}>
                          Dashboard
                        </NavLink>
                      </SheetClose>
                      <SheetClose asChild>
                        <NavLink to="/app/notifikasi" className={navClass}>
                          Notifikasi
                        </NavLink>
                      </SheetClose>
                      <SheetClose asChild>
                        <NavLink to="/app/profil" className={navClass}>
                          Profil
                        </NavLink>
                      </SheetClose>
                    </>
                  ) : null}
                </nav>
                <div className="mt-auto flex flex-col gap-2">
                  {user ? (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <Avatar name={user.name} color={user.avatarColor} size="sm" />
                        <span className="truncate font-medium">{user.name}</span>
                      </div>
                      <Button variant="outline" onClick={() => void handleSignOut()}>
                        <FiLogOut aria-hidden="true" />
                        Keluar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" asChild>
                        <SheetClose asChild>
                          <Link to="/masuk">Masuk</Link>
                        </SheetClose>
                      </Button>
                      <Button asChild>
                        <SheetClose asChild>
                          <Link to="/daftar">Daftar</Link>
                        </SheetClose>
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </Container>
      </header>

      <main id="konten" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <RallyUpMark className="size-8" />
              <span className="font-display text-base tracking-wide uppercase">RallyUp</span>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Pengelolaan fun match padel dan tenis: sesi, pasangan yang seimbang, dan rating
              komunitas yang dihitung dari hasil terverifikasi.
            </p>
          </div>
          <nav aria-label="Navigasi kaki halaman" className="flex flex-col gap-2 text-sm">
            {PUBLIC_NAV.map((item) => (
              <Link key={item.to} to={item.to} className="text-muted-foreground hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </Container>
        <Container className="flex flex-col gap-2 border-t border-border py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>RallyUp. Dibuat untuk komunitas padel dan tenis di Indonesia.</p>
          <p>Rating memakai Elo dan hanya berubah setelah skor dikonfirmasi.</p>
        </Container>
      </footer>
    </div>
  )
}
