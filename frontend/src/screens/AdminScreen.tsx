import { useEffect, useState } from 'react'
import { ApiError, api } from '../api/client'
import type { AdminGameConfig, ThemeName } from '../api/types'
import { Button } from '../components/ui/Button'
import { IconGear } from '../components/ui/Icons'
import { useGameStore } from '../store/useGameStore'
import './AdminScreen.css'

type Draft = AdminGameConfig

interface ArrayDrafts {
  red: { levels: string; loot: string }
  green: { levels: string; loot: string }
}

function toText(values: number[]): string {
  return values.join(', ')
}

function parseList(text: string): number[] | null {
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const numbers = parts.map(Number)
  return numbers.some((value) => Number.isNaN(value)) ? null : numbers
}

function NumberField({
  label,
  value,
  hint,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  hint?: string
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="admin__field">
      <span className="admin__label">{label}</span>
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : ''}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {hint && <span className="admin__hint">{hint}</span>}
    </label>
  )
}

function TextField({
  label,
  value,
  hint,
  onChange,
}: {
  label: string
  value: string
  hint?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="admin__field admin__field--wide">
      <span className="admin__label">{label}</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
      {hint && <span className="admin__hint">{hint}</span>}
    </label>
  )
}

export function AdminScreen() {
  const showToast = useGameStore((state) => state.showToast)
  const bootstrap = useGameStore((state) => state.bootstrap)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [arrays, setArrays] = useState<ArrayDrafts | null>(null)
  const [meta, setMeta] = useState<{ version: number; updatedAt: string; path: string } | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const response = await api.adminConfig()
      setDraft(response.config)
      setArrays({
        red: {
          levels: toText(response.config.themes.red.levelMultipliers),
          loot: toText(response.config.themes.red.lootProbabilities),
        },
        green: {
          levels: toText(response.config.themes.green.levelMultipliers),
          loot: toText(response.config.themes.green.lootProbabilities),
        },
      })
      setMeta({ version: response.version, updatedAt: response.updatedAt, path: response.path })
      setErrors([])
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Не удалось загрузить конфигурацию'
      showToast(message, 'error')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!draft || !arrays) {
    return (
      <div className="screen admin">
        <section className="card">
          <p className="muted">Загружаем параметры игры…</p>
        </section>
      </div>
    )
  }

  const patch = (updater: (current: Draft) => Draft) => setDraft((current) => (current ? updater(current) : current))

  const patchTheme = (theme: ThemeName, updater: (current: Draft['themes'][ThemeName]) => Draft['themes'][ThemeName]) =>
    patch((current) => ({
      ...current,
      themes: { ...current.themes, [theme]: updater(current.themes[theme]) },
    }))

  const save = async () => {
    const parsed: Draft = JSON.parse(JSON.stringify(draft)) as Draft
    const localErrors: string[] = []

    for (const theme of ['red', 'green'] as ThemeName[]) {
      const levels = parseList(arrays[theme].levels)
      const loot = parseList(arrays[theme].loot)
      if (!levels) localErrors.push(`themes.${theme}.levelMultipliers: список должен содержать только числа`)
      if (!loot) localErrors.push(`themes.${theme}.lootProbabilities: список должен содержать только числа`)
      if (levels) parsed.themes[theme].levelMultipliers = levels
      if (loot) parsed.themes[theme].lootProbabilities = loot
      // The number of levels always follows the list of thresholds.
      if (levels) parsed.themes[theme].levels = levels.length
    }

    if (localErrors.length > 0) {
      setErrors(localErrors)
      return
    }

    setSaving(true)
    try {
      const response = await api.saveAdminConfig(parsed)
      setErrors([])
      setMeta((current) =>
        current ? { ...current, version: response.version, updatedAt: response.updatedAt } : current,
      )
      showToast('Настройки применены — они вступят в силу в следующем раунде', 'success')
      // The public configuration feeds the bet screen, so refresh it right away.
      await bootstrap()
      await load()
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setErrors(error.message.split('; '))
      } else {
        const message = error instanceof ApiError ? error.message : 'Не удалось сохранить настройки'
        showToast(message, 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="screen admin">
      <section className="card admin__head">
        <div>
          <p className="card__title">
            <IconGear size={16} /> Параметры игры
          </p>
          <p className="admin__meta">
            Файл: <code>{meta?.path}</code>
          </p>
          <p className="admin__meta">
            Версия {meta?.version} · обновлено {meta ? new Date(meta.updatedAt).toLocaleString('ru-RU') : '—'} ·
            изменения применяются к следующему раунду, файл также можно править вручную — он перечитывается
            автоматически.
          </p>
        </div>
        <div className="admin__head-actions">
          <Button variant="secondary" onClick={() => void load()}>
            Сбросить
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? 'Сохраняем…' : 'Сохранить и применить'}
          </Button>
        </div>
      </section>

      {errors.length > 0 && (
        <section className="card admin__errors">
          <p className="card__title">Проверьте значения</p>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <p className="card__title">Базовые</p>
        <div className="admin__grid">
          <TextField
            label="game_id"
            value={draft.basic.gameId}
            onChange={(value) => patch((current) => ({ ...current, basic: { ...current.basic, gameId: value } }))}
          />
          <TextField
            label="game_name"
            value={draft.basic.gameName}
            onChange={(value) => patch((current) => ({ ...current, basic: { ...current.basic, gameName: value } }))}
          />
          <TextField
            label="game_type"
            value={draft.basic.gameType}
            onChange={(value) => patch((current) => ({ ...current, basic: { ...current.basic, gameType: value } }))}
          />
          <label className="admin__field admin__field--switch">
            <span className="admin__label">is_active</span>
            <input
              type="checkbox"
              checked={draft.basic.isActive}
              onChange={(event) =>
                patch((current) => ({ ...current, basic: { ...current.basic, isActive: event.target.checked } }))
              }
            />
            <span className="admin__hint">Выключенная игра не принимает новые ставки</span>
          </label>
        </div>
      </section>

      <section className="card">
        <p className="card__title">Математическая модель</p>
        <div className="admin__grid">
          <NumberField
            label="alpha"
            step={0.01}
            hint="Форма распределения Парето: меньше — длиннее полёты"
            value={draft.math.alpha}
            onChange={(value) => patch((current) => ({ ...current, math: { ...current.math, alpha: value } }))}
          />
          <NumberField
            label="min_crash_multiplier"
            step={0.05}
            value={draft.math.minCrashMultiplier}
            onChange={(value) =>
              patch((current) => ({ ...current, math: { ...current.math, minCrashMultiplier: value } }))
            }
          />
          <NumberField
            label="max_multiplier"
            step={0.5}
            value={draft.math.maxMultiplier}
            onChange={(value) => patch((current) => ({ ...current, math: { ...current.math, maxMultiplier: value } }))}
          />
          <NumberField
            label="multiplier_growth_rate"
            step={0.001}
            hint="Прирост коэффициента за один серверный тик"
            value={draft.math.multiplierGrowthRate}
            onChange={(value) =>
              patch((current) => ({ ...current, math: { ...current.math, multiplierGrowthRate: value } }))
            }
          />
          <NumberField
            label="fps"
            value={draft.math.fps}
            hint="Тиков в секунду, которые сервер рассылает клиенту"
            onChange={(value) => patch((current) => ({ ...current, math: { ...current.math, fps: value } }))}
          />
          <NumberField
            label="delta"
            step={0.001}
            hint="Шаг округления коэффициента при публикации"
            value={draft.math.delta}
            onChange={(value) => patch((current) => ({ ...current, math: { ...current.math, delta: value } }))}
          />
          <NumberField
            label="instant_crash_probability"
            step={0.005}
            hint="Доля раундов, где шар лопается сразу"
            value={draft.math.instantCrashProbability}
            onChange={(value) =>
              patch((current) => ({ ...current, math: { ...current.math, instantCrashProbability: value } }))
            }
          />
        </div>
      </section>

      <section className="card">
        <p className="card__title">Начисление очков</p>
        <div className="admin__grid">
          <NumberField
            label="points_per_line"
            value={draft.points.pointsPerLine}
            onChange={(value) => patch((current) => ({ ...current, points: { ...current.points, pointsPerLine: value } }))}
          />
          <NumberField
            label="points_cashout_bonus"
            value={draft.points.pointsCashoutBonus}
            onChange={(value) =>
              patch((current) => ({ ...current, points: { ...current.points, pointsCashoutBonus: value } }))
            }
          />
          <NumberField
            label="points_x2_bonus"
            value={draft.points.pointsX2Bonus}
            onChange={(value) => patch((current) => ({ ...current, points: { ...current.points, pointsX2Bonus: value } }))}
          />
          <NumberField
            label="points_x3_bonus"
            value={draft.points.pointsX3Bonus}
            onChange={(value) => patch((current) => ({ ...current, points: { ...current.points, pointsX3Bonus: value } }))}
          />
          <NumberField
            label="points_x4_bonus"
            value={draft.points.pointsX4Bonus}
            onChange={(value) => patch((current) => ({ ...current, points: { ...current.points, pointsX4Bonus: value } }))}
          />
        </div>
      </section>

      <section className="card">
        <p className="card__title">Значения бустеров</p>
        <div className="admin__grid">
          <NumberField
            label="multiplier_tier_1_value"
            step={0.5}
            hint="Всегда 1.0 — вариант без бустера"
            value={draft.boosters.multiplierTier1Value}
            onChange={(value) =>
              patch((current) => ({ ...current, boosters: { ...current.boosters, multiplierTier1Value: value } }))
            }
          />
          <NumberField
            label="multiplier_tier_2_value"
            step={0.5}
            value={draft.boosters.multiplierTier2Value}
            onChange={(value) =>
              patch((current) => ({ ...current, boosters: { ...current.boosters, multiplierTier2Value: value } }))
            }
          />
          <NumberField
            label="multiplier_tier_3_value"
            step={0.5}
            value={draft.boosters.multiplierTier3Value}
            onChange={(value) =>
              patch((current) => ({ ...current, boosters: { ...current.boosters, multiplierTier3Value: value } }))
            }
          />
          <NumberField
            label="multiplier_tier_4_value"
            step={0.5}
            value={draft.boosters.multiplierTier4Value}
            onChange={(value) =>
              patch((current) => ({ ...current, boosters: { ...current.boosters, multiplierTier4Value: value } }))
            }
          />
        </div>
      </section>

      <section className="card">
        <p className="card__title">Окно «Закрепи успех»</p>
        <div className="admin__grid">
          <NumberField
            label="MIN_WIN_AMOUNT"
            value={draft.upsell.minWinAmount}
            onChange={(value) => patch((current) => ({ ...current, upsell: { ...current.upsell, minWinAmount: value } }))}
          />
          <NumberField
            label="POPUP_TIMEOUT (сек)"
            value={draft.upsell.popupTimeoutSeconds}
            onChange={(value) =>
              patch((current) => ({ ...current, upsell: { ...current.upsell, popupTimeoutSeconds: value } }))
            }
          />
          <NumberField
            label="Цена билета"
            value={draft.upsell.ticketPrice}
            onChange={(value) => patch((current) => ({ ...current, upsell: { ...current.upsell, ticketPrice: value } }))}
          />
          <NumberField
            label="Максимум билетов"
            value={draft.upsell.maxTickets}
            onChange={(value) => patch((current) => ({ ...current, upsell: { ...current.upsell, maxTickets: value } }))}
          />
        </div>
      </section>

      {(['red', 'green'] as ThemeName[]).map((theme) => {
        const themeDraft = draft.themes[theme]
        return (
          <section key={theme} className="card">
            <p className="card__title">
              Тема «{themeDraft.title}» ({theme === 'red' ? 'красная' : 'зелёная'})
            </p>
            <div className="admin__grid">
              <TextField
                label="Название"
                value={themeDraft.title}
                onChange={(value) => patchTheme(theme, (current) => ({ ...current, title: value }))}
              />
              <TextField
                label="Пороги уровней (levelMultipliers)"
                hint={`Количество уровней берётся из этого списка: сейчас ${themeDraft.levels}`}
                value={arrays[theme].levels}
                onChange={(value) =>
                  setArrays((current) =>
                    current ? { ...current, [theme]: { ...current[theme], levels: value } } : current,
                  )
                }
              />
              <TextField
                label="Вероятности бустера (line_N_loot_prob)"
                hint="По одному значению на уровень, нормируются автоматически"
                value={arrays[theme].loot}
                onChange={(value) =>
                  setArrays((current) =>
                    current ? { ...current, [theme]: { ...current[theme], loot: value } } : current,
                  )
                }
              />
            </div>

            <p className="admin__subtitle">Фрагменты ставок</p>
            <div className="admin__options">
              {themeDraft.betOptions.map((option, index) => (
                <div key={option.id} className="admin__option">
                  <span className="admin__option-id">{option.id}</span>
                  <NumberField
                    label="Стоимость"
                    value={option.cost}
                    onChange={(value) =>
                      patchTheme(theme, (current) => {
                        const betOptions = [...current.betOptions]
                        betOptions[index] = { ...betOptions[index], cost: value }
                        return { ...current, betOptions }
                      })
                    }
                  />
                  <NumberField
                    label="Бустер (1-4)"
                    value={option.boosterTier}
                    onChange={(value) =>
                      patchTheme(theme, (current) => {
                        const betOptions = [...current.betOptions]
                        betOptions[index] = { ...betOptions[index], boosterTier: value }
                        return { ...current, betOptions }
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <section className="card">
        <p className="card__title">Режим разработчика</p>
        <div className="admin__grid">
          <TextField
            label="Фиксированный seed"
            hint="Пусто — случайные раунды. Заданное значение делает раунды воспроизводимыми."
            value={draft.dev.fixedSeed ?? ''}
            onChange={(value) => patch((current) => ({ ...current, dev: { fixedSeed: value.trim() ? value : null } }))}
          />
        </div>
      </section>

      <div className="admin__footer">
        <Button size="lg" disabled={saving} onClick={() => void save()}>
          {saving ? 'Сохраняем…' : 'Сохранить и применить'}
        </Button>
      </div>
    </div>
  )
}
