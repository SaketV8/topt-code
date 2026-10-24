import {useEffect, useMemo, useState} from 'react'
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Github,
  MoreVertical,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2
} from 'lucide-react'
import logo from '../images/icon.png'
import {Button, buttonVariants} from '@/components/ui/button'
import {cn} from '@/lib/utils'
import {Card, CardContent} from '@/components/ui/card'
import {Separator} from '@/components/ui/separator'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Progress} from '@/components/ui/progress'
import {Select} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  ALGORITHM_OPTIONS,
  DIGITS_OPTIONS,
  ENTRIES_STORAGE_KEY,
  PERIOD_OPTIONS,
  generateCode,
  loadEntries,
  parseOtpauth,
  saveEntries,
  type Algorithm,
  type Digits,
  type GeneratedCode,
  type Period,
  type TotpEntry
} from '@/lib/totp'

const DIGITS_SELECT = DIGITS_OPTIONS.map((d) => ({
  value: String(d),
  label: String(d)
}))
const PERIOD_SELECT = PERIOD_OPTIONS.map((p) => ({
  value: String(p),
  label: `${p} seconds`
}))
const ALGORITHM_SELECT = ALGORITHM_OPTIONS.map((a) => ({value: a, label: a}))

// Per-viewer UI preference, remembered across popup open/close. Synchronous
// localStorage avoids a flash of visible codes before an async read returns.
const SHOW_CODES_KEY = 'topt:showCodes'

const REPO_URL = 'https://github.com/saketV8/topt-code'

function loadShowCodes(): boolean {
  try {
    return localStorage.getItem(SHOW_CODES_KEY) !== 'false'
  } catch {
    return true
  }
}

// Split a code down the middle so it is easier to read: 123456 -> "123 456".
function formatCode(code: string) {
  if (!code) return code
  const mid = Math.ceil(code.length / 2)

  return `${code.slice(0, mid)} ${code.slice(mid)}`
}

interface FormState {
  title: string
  secret: string
  issuer: string
  digits: string
  period: string
  algorithm: Algorithm
}

const EMPTY_FORM: FormState = {
  title: '',
  secret: '',
  issuer: '',
  digits: '6',
  period: '30',
  algorithm: 'SHA1'
}

// ---------------------------------------------------------------------------
// Add / edit dialog
// ---------------------------------------------------------------------------

function EntryDialog({
  open,
  onOpenChange,
  entry,
  onSubmit
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: TotpEntry | null
  onSubmit: (entry: TotpEntry) => void
}) {
  const isEdit = Boolean(entry)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  // Prefill (edit) or clear (add) the form whenever the dialog opens.
  useEffect(() => {
    if (!open) return

    setForm(
      entry
        ? {
            title: entry.title,
            secret: entry.secret,
            issuer: entry.issuer,
            digits: String(entry.digits),
            period: String(entry.period),
            algorithm: entry.algorithm
          }
        : EMPTY_FORM
    )
    setShowSecret(false)
    setError(undefined)
    setSaving(false)
  }, [open, entry])

  const update = (patch: Partial<FormState>) =>
    setForm((prev) => ({...prev, ...patch}))

  // Pasting an otpauth:// URI into the secret field fills everything it can.
  const handleSecretChange = (value: string) => {
    const parsed = parseOtpauth(value)

    if (parsed?.secret) {
      update({
        secret: parsed.secret,
        title: parsed.title ?? form.title,
        issuer: parsed.issuer ?? form.issuer,
        digits: parsed.digits ? String(parsed.digits) : form.digits,
        period: parsed.period ? String(parsed.period) : form.period,
        algorithm: parsed.algorithm ?? form.algorithm
      })

      return
    }

    update({secret: value})
  }

  const canSubmit =
    form.title.trim().length > 0 &&
    form.secret.trim().length > 0 &&
    form.issuer.trim().length > 0 &&
    !saving

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    setSaving(true)
    setError(undefined)

    const nextEntry: TotpEntry = {
      id: entry?.id ?? crypto.randomUUID(),
      title: form.title.trim(),
      secret: form.secret,
      issuer: form.issuer.trim(),
      digits: Number(form.digits) as Digits,
      period: Number(form.period) as Period,
      algorithm: form.algorithm,
      type: 'TOTP',
      createdAt: entry?.createdAt ?? Date.now()
    }

    // Validate the secret by actually generating a code with it.
    try {
      await generateCode(nextEntry)
    } catch {
      setError('That secret is not valid base32. Check it and try again.')
      setSaving(false)

      return
    }

    onSubmit(nextEntry)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="shrink-0 border-b p-4">
          <DialogTitle>{isEdit ? 'Edit account' : 'Add account'}</DialogTitle>
          <DialogDescription>
            Enter the secret your service shows, or paste an otpauth:// link.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Work email"
              value={form.title}
              onChange={(e) => update({title: e.target.value})}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="secret">Secret</Label>
            <div className="relative">
              <Input
                id="secret"
                className="pr-9 font-mono"
                placeholder="Base32 secret"
                type={showSecret ? 'text' : 'password'}
                value={form.secret}
                onChange={(e) => handleSecretChange(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issuer">Issuer</Label>
            <Input
              id="issuer"
              placeholder="e.g. GitHub"
              value={form.issuer}
              onChange={(e) => update({issuer: e.target.value})}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs font-medium">
              Advanced options
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="digits">Digits</Label>
              <Select
                id="digits"
                aria-label="Digits"
                value={form.digits}
                onValueChange={(v) => update({digits: v})}
                options={DIGITS_SELECT}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="period">Time interval</Label>
              <Select
                id="period"
                aria-label="Time interval"
                value={form.period}
                onValueChange={(v) => update({period: v})}
                options={PERIOD_SELECT}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="algorithm">Algorithm</Label>
              <Select
                id="algorithm"
                aria-label="Algorithm"
                value={form.algorithm}
                onValueChange={(v) => update({algorithm: v as Algorithm})}
                options={ALGORITHM_SELECT}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Input id="type" value="TOTP" readOnly disabled />
            </div>
          </div>

          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}
          </div>

          <DialogFooter className="shrink-0 border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving
                ? 'Saving…'
                : isEdit
                  ? 'Update account'
                  : 'Add account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Delete confirmation
// ---------------------------------------------------------------------------

function ConfirmDeleteDialog({
  entry,
  onOpenChange,
  onConfirm
}: {
  entry: TotpEntry | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  // Hold onto the last entry so its name stays put during the close animation.
  const [shown, setShown] = useState<TotpEntry | null>(entry)

  useEffect(() => {
    if (entry) setShown(entry)
  }, [entry])

  return (
    <Dialog open={Boolean(entry)} onOpenChange={onOpenChange}>
      <DialogContent className="h-auto">
        <div className="flex flex-col gap-4 p-4">
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This permanently removes{' '}
              <span className="text-foreground font-medium">
                {shown ? shown.title : 'this account'}
              </span>{' '}
              and its secret. You can’t undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              <Trash2 />
              Delete
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// List item
// ---------------------------------------------------------------------------

function TotpListItem({
  entry,
  code,
  now,
  visible,
  onEdit,
  onRequestDelete
}: {
  entry: TotpEntry
  code: GeneratedCode | undefined
  now: number
  visible: boolean
  onEdit: (entry: TotpEntry) => void
  onRequestDelete: (entry: TotpEntry) => void
}) {
  const [copied, setCopied] = useState(false)

  const masked = formatCode('•'.repeat(entry.digits))

  const remainingMs = code ? Math.max(0, code.expires - now) : 0
  const secondsLeft = Math.ceil(remainingMs / 1000)
  const percent = code ? (remainingMs / (entry.period * 1000)) * 100 : 0
  const urgent = secondsLeft <= 5
  const warning = secondsLeft <= 15 && secondsLeft > 5

  const copy = async () => {
    if (!code || code.error) return

    await navigator.clipboard.writeText(code.otp)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-muted-foreground truncate text-xs">
              {entry.issuer}
            </p>
            <p className="truncate text-sm font-medium">{entry.title}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({variant: 'ghost', size: 'icon-sm'}),
                'text-muted-foreground -mt-1 -mr-1 shrink-0'
              )}
              aria-label={`Options for ${entry.title}`}
            >
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onEdit(entry)}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onRequestDelete(entry)}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {code?.error ? (
          <p className="text-destructive text-sm">Invalid secret</p>
        ) : (
          <div className="flex items-end justify-between gap-2">
            <button
              type="button"
              onClick={copy}
              className="group flex items-center gap-2 text-left"
              aria-label="Copy code"
            >
              <span className="font-mono text-2xl font-semibold tracking-wide tabular-nums">
                {!visible ? masked : code ? formatCode(code.otp) : '••• •••'}
              </span>
              {copied ? (
                <Check className="size-4 text-emerald-500" />
              ) : (
                <Copy className="text-muted-foreground group-hover:text-foreground size-4" />
              )}
            </button>
            <div className="text-right">
              <p className="text-muted-foreground text-[10px] leading-none">
                next
              </p>
              <p className="text-muted-foreground font-mono text-xs tabular-nums">
                {!visible ? masked : code ? formatCode(code.next) : '•••'}
              </p>
            </div>
          </div>
        )}

        {!code?.error ? (
          <div className="flex items-center gap-2">
            <Progress
              key={code?.expires ?? 'empty'}
              value={percent}
              countdownMs={code ? entry.period * 1000 : undefined}
              expiresAt={code?.expires}
              indicatorClassName={
                urgent
                  ? 'bg-destructive'
                  : warning
                    ? 'bg-yellow-500'
                    : undefined
              }
            />
            <span
              className={
                'w-6 text-right text-xs tabular-nums ' +
                (urgent
                  ? 'text-destructive'
                  : warning
                    ? 'text-yellow-600 dark:text-yellow-500'
                    : 'text-muted-foreground')
              }
            >
              {secondsLeft}s
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function PopupApp() {
  const [entries, setEntries] = useState<TotpEntry[]>([])
  const [codes, setCodes] = useState<Record<string, GeneratedCode>>({})
  const [now, setNow] = useState(Date.now())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TotpEntry | null>(null)
  const [confirmEntry, setConfirmEntry] = useState<TotpEntry | null>(null)
  const [showCodes, setShowCodes] = useState(loadShowCodes)

  const toggleShowCodes = () =>
    setShowCodes((prev) => {
      const next = !prev

      try {
        localStorage.setItem(SHOW_CODES_KEY, String(next))
      } catch {
        // Ignore storage failures (e.g. private mode); state still updates.
      }

      return next
    })

  // Load saved accounts and keep in sync with other popup instances.
  useEffect(() => {
    loadEntries().then(setEntries)

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== 'local' || !(ENTRIES_STORAGE_KEY in changes)) return
      setEntries((changes[ENTRIES_STORAGE_KEY].newValue as TotpEntry[]) ?? [])
    }

    chrome.storage.onChanged.addListener(onChanged)

    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [])

  // Clock tick that drives the countdown and triggers regeneration.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)

    return () => clearInterval(timer)
  }, [])

  // Regenerate only the codes whose window has rolled over (or are missing).
  useEffect(() => {
    const stale = entries.filter((entry) => {
      const code = codes[entry.id]

      return !code || code.expires <= now
    })

    if (stale.length === 0) return

    let cancelled = false

    Promise.all(
      stale.map(async (entry) => {
        try {
          const code = await generateCode(entry, now)

          return [entry.id, code] as const
        } catch {
          return [
            entry.id,
            {
              otp: '',
              next: '',
              expires: now + entry.period * 1000,
              period: entry.period,
              error: true
            }
          ] as const
        }
      })
    ).then((results) => {
      if (cancelled) return

      setCodes((prev) => {
        const next = {...prev}
        for (const [id, code] of results) next[id] = code

        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [entries, now, codes])

  // Add a new entry or replace an edited one (matched by id), then persist.
  const submitEntry = (entry: TotpEntry) => {
    const exists = entries.some((e) => e.id === entry.id)
    const next = exists
      ? entries.map((e) => (e.id === entry.id ? entry : e))
      : [...entries, entry]

    setEntries(next)
    saveEntries(next)

    // Drop any cached code so an edited entry regenerates immediately.
    setCodes((prev) => {
      if (!(entry.id in prev)) return prev
      const copy = {...prev}
      delete copy[entry.id]

      return copy
    })
  }

  const deleteEntry = (id: string) => {
    const next = entries.filter((entry) => entry.id !== id)
    setEntries(next)
    saveEntries(next)
  }

  const openAdd = () => {
    setEditingEntry(null)
    setDialogOpen(true)
  }

  const openEdit = (entry: TotpEntry) => {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  const confirmDelete = () => {
    if (confirmEntry) deleteEntry(confirmEntry.id)
    setConfirmEntry(null)
  }

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.createdAt - b.createdAt),
    [entries]
  )

  return (
    <div className="flex min-h-[540px] flex-col gap-3 p-3.5">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" aria-hidden="true" className="size-6" />
          <h1 className="text-base font-semibold">Topt Code</h1>
        </div>
        <Button size="icon-sm" onClick={openAdd} aria-label="Add account">
          <Plus />
        </Button>
      </header>

      <Separator />

      {sorted.length > 0 ? (
        <div className="-mt-1 flex items-center justify-end gap-2">
          <span className="text-muted-foreground text-xs">
            {showCodes ? 'Hide codes' : 'Show codes'}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={toggleShowCodes}
            aria-label={showCodes ? 'Hide codes' : 'Show codes'}
          >
            {showCodes ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      ) : null}

      {sorted.length > 0 ? (
        <div className="flex flex-1 flex-col gap-2">
          {sorted.map((entry) => (
            <TotpListItem
              key={entry.id}
              entry={entry}
              code={codes[entry.id]}
              now={now}
              visible={showCodes}
              onEdit={openEdit}
              onRequestDelete={setConfirmEntry}
            />
          ))}
        </div>
      ) : (
        <Card className="flex-1">
          <CardContent className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <ShieldCheck className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">No accounts yet</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Add an account with the + button to start generating one-time
              codes.
            </p>
            <Button size="sm" className="mt-1" onClick={openAdd}>
              <Plus />
              Add account
            </Button>
          </CardContent>
        </Card>
      )}

      <footer className="text-muted-foreground mt-auto flex items-center justify-center gap-1.5 pt-1">
        <span className="text-[10px]">Built by Saket</span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
          aria-label="View source on GitHub"
          title="View on GitHub"
        >
          <Github className="size-3.5" />
        </a>
      </footer>

      <EntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editingEntry}
        onSubmit={submitEntry}
      />

      <ConfirmDeleteDialog
        entry={confirmEntry}
        onOpenChange={(open) => {
          if (!open) setConfirmEntry(null)
        }}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
