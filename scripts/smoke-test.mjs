/**
 * End to end smoke test of the backend game loop.
 * Runs the mandatory scenarios over the real HTTP + WebSocket API:
 *   1. bet and round start        2. successful cashout
 *   3. crash without cashout      4. booster activation
 *   5. changing points_per_line through the admin API
 *
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */

const base = process.argv[2] ?? 'http://localhost:8080'
const wsBase = base.replace(/^http/, 'ws')

const json = async (path, init) => {
  const response = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${response.status}: ${text}`)
  }
  return body
}

/** Plays one round and resolves with every event the server pushed. */
function playRound(roundId, { cashoutAtLevel = null } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${wsBase}/ws/game?roundId=${roundId}`)
    const events = []
    let cashoutSent = false

    const timeout = setTimeout(() => {
      socket.close()
      reject(new Error('раунд не завершился за 90 секунд'))
    }, 90_000)

    socket.onmessage = (message) => {
      const event = JSON.parse(message.data)
      events.push(event)
      if (
        cashoutAtLevel !== null &&
        !cashoutSent &&
        event.type === 'level' &&
        event.level >= cashoutAtLevel
      ) {
        cashoutSent = true
        socket.send(JSON.stringify({ type: 'cashout' }))
      }
      if (event.type === 'crash') {
        clearTimeout(timeout)
        socket.close()
        resolve(events)
      }
    }

    socket.onerror = (error) => {
      clearTimeout(timeout)
      reject(new Error(`ошибка websocket: ${error.message ?? 'unknown'}`))
    }
  })
}

const summary = (events) => {
  const crash = events.find((event) => event.type === 'crash')
  const levels = events.filter((event) => event.type === 'level')
  const boost = events.find((event) => event.type === 'boost')
  const cashout = events.find((event) => event.type === 'cashout')
  return { crash, levels, boost, cashout }
}

const check = (condition, message) => {
  if (!condition) {
    throw new Error(`ПРОВАЛ: ${message}`)
  }
  console.log(`  ok — ${message}`)
}

const run = async () => {
  console.log('Сценарий 1: сессия, конфигурация и запуск раунда')
  const session = await json('/api/session', { method: 'POST' })
  const config = await json('/api/config/public')
  check(session.balance > 0, `демо-игрок «${session.name}» с балансом ${session.balance}`)
  check(config.themes.green.levels === 9, 'зелёная тема: 9 уровней')
  check(config.themes.red.levels === 12, 'красная тема: 12 уровней')

  const withBooster = config.themes.green.betOptions.find((option) => option.boosterTier >= 2)
  const balanceBefore = session.balance
  const started = await json('/api/rounds', {
    method: 'POST',
    body: JSON.stringify({ playerId: session.playerId, theme: 'green', betOptionId: withBooster.id }),
  })
  check(started.balance === balanceBefore - withBooster.cost, `ставка ${withBooster.cost} списана с баланса`)
  check(typeof started.commitHash === 'string' && started.commitHash.length === 64, 'клиент получил SHA-256 хеш раунда')
  check(started.boosterLevel >= 1, `бустер x${started.boosterValue} размещён на уровне ${started.boosterLevel}`)

  console.log('\nСценарий 2 и 4: cashout после первого уровня, бустер')
  const first = summary(await playRound(started.roundId, { cashoutAtLevel: 1 }))
  if (first.cashout) {
    check(first.cashout.win > 0, `забрано ${first.cashout.win} баллов на x${first.cashout.multiplier}`)
    check(first.cashout.message === 'Могли бы забрать больше', 'сервер прислал «Могли бы забрать больше»')
  } else {
    console.log('  внимание — шар лопнул до первого уровня, cashout был недоступен')
  }
  check(first.crash !== undefined, `раунд завершён крахом на x${first.crash.crashMultiplier}`)
  check(first.crash.reward?.title !== undefined, `выдана награда: фрагмент «${first.crash.reward.title}»`)
  check(first.crash.fairness.serverSeed.length > 0, 'после краха раскрыт seed для проверки честности')
  if (first.boost) {
    check(first.boost.boosterValue >= 2, `бустер сработал на уровне ${first.boost.level}: x${first.boost.boosterValue}`)
  }

  console.log('\nСценарий 3: проигрыш без cashout')
  const cheapest = config.themes.red.betOptions.reduce((min, option) => (option.cost < min.cost ? option : min))
  const second = await json('/api/rounds', {
    method: 'POST',
    body: JSON.stringify({ playerId: session.playerId, theme: 'red', betOptionId: cheapest.id }),
  })
  const lost = summary(await playRound(second.roundId))
  check(lost.crash.win === 0, `ставка сгорела, коэффициент краха x${lost.crash.crashMultiplier}`)
  check(lost.crash.points >= 0, `за раунд начислено ${lost.crash.points} игровых очков`)

  console.log('\nИстория и турнир')
  const history = await json('/api/history?limit=10')
  check(history.length > 0, `в истории ${history.length} завершённых раундов всех игроков`)
  const tournament = await json(`/api/tournament?playerId=${session.playerId}&mask=true`)
  check(tournament.participants.length > 1, `в турнире ${tournament.participants.length} участников`)
  check(tournament.currentRank > 0, `текущее место игрока: ${tournament.currentRank}`)
  const masked = tournament.participants.find((participant) => !participant.current)
  check(masked.name.startsWith('***'), `имена соперников деперсонализированы: ${masked.name}`)

  console.log('\nСценарий 5: изменение points_per_line через админ-API')
  const adminBefore = await json('/api/admin/config')
  const original = adminBefore.config.points.pointsPerLine
  const changed = original === 50 ? 70 : 50
  const updated = JSON.parse(JSON.stringify(adminBefore.config))
  updated.points.pointsPerLine = changed
  const applyResult = await json('/api/admin/config', { method: 'PUT', body: JSON.stringify(updated) })
  check(applyResult.applied, `новое значение points_per_line = ${changed} применено (версия ${applyResult.version})`)

  const third = await json('/api/rounds', {
    method: 'POST',
    body: JSON.stringify({ playerId: session.playerId, theme: 'red', betOptionId: cheapest.id }),
  })
  const probe = summary(await playRound(third.roundId))
  if (probe.levels.length > 0) {
    check(probe.levels[0].points === changed, `за первый уровень начислено ${probe.levels[0].points} очков`)
  } else {
    console.log('  внимание — шар лопнул до первого уровня, начисление не проверено в этом раунде')
  }

  const invalid = JSON.parse(JSON.stringify(adminBefore.config))
  invalid.math.fps = 500
  const invalidResponse = await fetch(base + '/api/admin/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalid),
  })
  check(invalidResponse.status === 422, 'некорректное значение fps отклонено валидацией (HTTP 422)')

  const restored = JSON.parse(JSON.stringify(adminBefore.config))
  restored.points.pointsPerLine = original
  await json('/api/admin/config', { method: 'PUT', body: JSON.stringify(restored) })
  console.log(`  ok — исходное значение points_per_line = ${original} возвращено`)

  console.log('\nВсе проверки пройдены.')
}

run().catch((error) => {
  console.error('\n' + error.message)
  process.exit(1)
})
