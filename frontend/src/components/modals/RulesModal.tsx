import type { PublicConfig } from '../../api/types'
import { formatNumber } from '../../lib/format'
import { Modal } from '../ui/Modal'
import './RulesModal.css'

interface RulesModalProps {
  open: boolean
  onClose: () => void
  config: PublicConfig | null
}

export function RulesModal({ open, onClose, config }: RulesModalProps) {
  const points = config?.points
  const upsell = config?.upsell
  const red = config?.themes.red
  const green = config?.themes.green

  return (
    <Modal open={open} onClose={onClose} title="Правила игры" subtitle="Воздушный шар — бонусная crash-игра">
      <div className="rules">
        <section className="rules__block">
          <h3 className="rules__title">Ставка и списание</h3>
          <p>
            Выберите один из четырёх фрагментов пазла. Каждый фрагмент задаёт стоимость ставки в бонусных
            баллах и бустер (x1, x2, x3, x4). При нажатии «Начать игру» стоимость сразу списывается с баланса.
            Если баллов не хватает, фрагмент недоступен.
          </p>
        </section>

        <section className="rules__block">
          <h3 className="rules__title">Полёт и коэффициент</h3>
          <p>
            Шар поднимается, и коэффициент растёт в реальном времени. Момент, когда шар лопнет, сервер
            определяет до старта полёта — повлиять на него нельзя, можно только выбрать момент выхода.
            Зелёная тема содержит {green?.levels ?? 9} уровней, красная — {red?.levels ?? 12}.
          </p>
        </section>

        <section className="rules__block">
          <h3 className="rules__title">Кнопка «Забрать»</h3>
          <p>
            Кнопка становится активной после прохождения первого уровня. Выигрыш = ставка × текущий
            коэффициент. После нажатия шар продолжает лететь до момента краха, но сумма уже не меняется. Если
            не успеть забрать до краха — ставка сгорает.
          </p>
        </section>

        <section className="rules__block">
          <h3 className="rules__title">Бустер</h3>
          <p>
            Бустер «ждёт» на одном из уровней; его позицию сервер выбирает случайно перед каждым раундом.
            Если шар дойдёт до этого уровня до нажатия «Забрать», коэффициент умножается на значение бустера.
            После cashout бустер не срабатывает.
          </p>
        </section>

        <section className="rules__block">
          <h3 className="rules__title">Игровые очки</h3>
          <p>
            Очки учитываются отдельно от бонусных баллов и идут в турнирный рейтинг:
            {' '}
            {points ? `${points.pointsPerLine} за каждый пройденный уровень, ${points.pointsCashoutBonus} за успешный cashout, ${points.pointsX2Bonus}/${points.pointsX3Bonus}/${points.pointsX4Bonus} за активацию бустера x2/x3/x4.` : 'значения задаются в конфигурации игры.'}
          </p>
        </section>

        <section className="rules__block">
          <h3 className="rules__title">Дополнительная награда</h3>
          <p>
            По итогам каждого раунда — и при выигрыше, и при проигрыше — выдаётся случайный фрагмент коллекции
            «Воздушный шар». Всего фрагментов девять; собранные фрагменты видны в профиле. Редкие фрагменты
            выпадают реже обычных.
          </p>
        </section>

        <section className="rules__block">
          <h3 className="rules__title">Закрепи успех</h3>
          <p>
            После удачного раунда с выигрышем от {upsell ? formatNumber(upsell.minWinAmount) : 50} баллов
            появляется предложение купить лотерейные билеты за бонусные баллы. Покупка имитируется в рамках
            прототипа, а окно показывается не чаще одного раза за игровую сессию.
          </p>
        </section>

        <section className="rules__block">
          <h3 className="rules__title">Честность</h3>
          <p>
            До начала полёта сервер публикует SHA-256 хеш от точки краха и позиции бустера, а после раунда
            раскрывает секрет — можно убедиться, что результат не менялся во время полёта. Хеш и секрет видны
            на экране результата.
          </p>
        </section>
      </div>
    </Modal>
  )
}
