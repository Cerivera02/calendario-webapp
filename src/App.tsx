import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type ShiftType = 'DÍA' | 'NOCHE' | 'DESCANSO'

interface ShiftDay {
  date: Date
  type: ShiftType
}

function formatDateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function getMonthMatrix(year: number, monthIndex: number) {
  // monthIndex: 0 = enero
  const firstDay = new Date(year, monthIndex, 1)
  // 0 = domingo, 1 = lunes, ... -> queremos semanas que empiecen en lunes
  const firstWeekday = (firstDay.getDay() + 6) % 7 // 0 = lunes, 6 = domingo
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

  const weeks: (Date | null)[][] = []
  let currentWeek: (Date | null)[] = []

  // Rellenar huecos antes del primer día
  for (let i = 0; i < firstWeekday; i++) {
    currentWeek.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(new Date(year, monthIndex, day))
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  // Rellenar huecos al final
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    weeks.push(currentWeek)
  }

  return weeks
}

// Patrón base: 4 día, 2 descanso, 4 noche, 2 descanso, se repite.
const BASE_PATTERN: ShiftType[] = [
  'DÍA', 'DÍA', 'DÍA', 'DÍA',
  'DESCANSO', 'DESCANSO',
  'NOCHE', 'NOCHE', 'NOCHE', 'NOCHE',
  'DESCANSO', 'DESCANSO',
]

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const weekdayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Claves para localStorage
const STORAGE_KEY_START_DATE = 'calendario-turnos-start-date'
const STORAGE_KEY_START_SHIFT = 'calendario-turnos-start-shift'
const STORAGE_KEY_COLOR_DIA = 'calendario-turnos-color-dia'
const STORAGE_KEY_COLOR_NOCHE = 'calendario-turnos-color-noche'
const STORAGE_KEY_COLOR_DESCANSO = 'calendario-turnos-color-descanso'

// Colores por defecto
const DEFAULT_COLOR_DIA = '#bfdbfe'
const DEFAULT_COLOR_NOCHE = '#c7d2fe'
const DEFAULT_COLOR_DESCANSO = '#dcfce7'

// Función para aclarar un color (para gradientes)
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * percent))
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent))
  const b = Math.min(255, (num & 0xff) + Math.round(255 * percent))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// Función para oscurecer un color (para bordes y texto)
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * percent))
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * percent))
  const b = Math.max(0, (num & 0xff) - Math.round(255 * percent))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function App() {
  const today = new Date()
  // Fecha ancla del mes actual (siempre día 1)
  const [currentMonthDate, setCurrentMonthDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)

  // Refs para activar los color pickers desde las "chips"
  const colorDiaInputRef = useRef<HTMLInputElement | null>(null)
  const colorNocheInputRef = useRef<HTMLInputElement | null>(null)
  const colorDescansoInputRef = useRef<HTMLInputElement | null>(null)

  // Inicializar desde localStorage o valores por defecto
  const [startDateStr, setStartDateStr] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_START_DATE)
    return saved || formatDateKey(today)
  })
  const [startShift, setStartShift] = useState<'DÍA' | 'NOCHE'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_START_SHIFT)
    return (saved === 'DÍA' || saved === 'NOCHE') ? saved : 'DÍA'
  })

  // Estados para colores personalizados
  const [colorDia, setColorDia] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COLOR_DIA)
    return saved || DEFAULT_COLOR_DIA
  })
  const [colorNoche, setColorNoche] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COLOR_NOCHE)
    return saved || DEFAULT_COLOR_NOCHE
  })
  const [colorDescanso, setColorDescanso] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COLOR_DESCANSO)
    return saved || DEFAULT_COLOR_DESCANSO
  })

  // Guardar en localStorage cuando cambien los valores
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_START_DATE, startDateStr)
  }, [startDateStr])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_START_SHIFT, startShift)
  }, [startShift])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLOR_DIA, colorDia)
  }, [colorDia])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLOR_NOCHE, colorNoche)
  }, [colorNoche])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLOR_DESCANSO, colorDescanso)
  }, [colorDescanso])

  const currentYear = currentMonthDate.getFullYear()
  const currentMonth = currentMonthDate.getMonth() // 0-11

  const monthMatrix = useMemo(
    () => getMonthMatrix(currentYear, currentMonth),
    [currentYear, currentMonth],
  )

  const startDate = useMemo(() => new Date(startDateStr), [startDateStr])

  const getShiftForDate = (date: Date): ShiftDay => {
    // Diferencia en días entre la fecha y la fecha de inicio
    const msPerDay = 1000 * 60 * 60 * 24
    const diffMs = date.getTime() - startDate.getTime()
    const diffDays = Math.floor(diffMs / msPerDay)

    // Rotación del patrón según turno inicial
    let baseOffset = 0
    if (startShift === 'NOCHE') {
      baseOffset = BASE_PATTERN.indexOf('NOCHE')
    }

    // Soportar fechas antes de la fecha de inicio (diffDays negativo)
    const len = BASE_PATTERN.length
    const patternIndex = ((diffDays + baseOffset) % len + len) % len
    const type = BASE_PATTERN[patternIndex]

    return { date, type }
  }

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      d.setDate(1)
      return d
    })
  }

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      d.setDate(1)
      return d
    })
  }

  const handleMonthTitleClick = () => {
    setIsMonthPickerOpen(true)
  }

  const handleMonthSelectChange = (event: any) => {
    const value = Number(event.target.value)
    if (!Number.isNaN(value)) {
      setCurrentMonthDate((prev) => {
        const d = new Date(prev)
        d.setMonth(value)
        d.setDate(1)
        return d
      })
    }
  }

  const handleYearSelectChange = (event: any) => {
    const value = Number(event.target.value)
    if (!Number.isNaN(value)) {
      setCurrentMonthDate((prev) => {
        const d = new Date(prev)
        d.setFullYear(value)
        d.setDate(1)
        return d
      })
    }
  }

  const getShiftInfo = (date: Date | null) => {
    if (!date) return null
    return getShiftForDate(date)
  }

  return (
    <div className="app-container">
      <h1>Calendario de Turnos 4x2 (Día / Noche)</h1>

      <section className="controls">
        <div className="control-group">
          <label htmlFor="startDate">
            Fecha de inicio del patrón
          </label>
          <input
            id="startDate"
            type="date"
            value={startDateStr}
            onChange={(e) => setStartDateStr(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            style={{ cursor: 'pointer' }}
          />
        </div>

        <div className="control-group">
          <label htmlFor="startShift">
            Turno inicial (primeros 4 días)
          </label>
          <select
            id="startShift"
            value={startShift}
            onChange={(e) => setStartShift(e.target.value as 'DÍA' | 'NOCHE')}
          >
            <option value="DÍA">Día</option>
            <option value="NOCHE">Noche</option>
          </select>
        </div>

        <div className="legend">
          <div className="legend-item">
            <input
              id="colorDia"
              ref={colorDiaInputRef}
              type="color"
              value={colorDia}
              onChange={(e) => setColorDia(e.target.value)}
              className="color-picker"
            />
            <button
              type="button"
              className="badge badge-dia badge-clickable"
              style={{
                backgroundColor: colorDia,
                color: darkenColor(colorDia, 0.4),
              }}
              onClick={() => colorDiaInputRef.current?.click()}
            >
              Día
            </button>
          </div>
          <div className="legend-item">
            <input
              id="colorNoche"
              ref={colorNocheInputRef}
              type="color"
              value={colorNoche}
              onChange={(e) => setColorNoche(e.target.value)}
              className="color-picker"
            />
            <button
              type="button"
              className="badge badge-noche badge-clickable"
              style={{
                backgroundColor: colorNoche,
                color: darkenColor(colorNoche, 0.4),
              }}
              onClick={() => colorNocheInputRef.current?.click()}
            >
              Noche
            </button>
          </div>
          <div className="legend-item">
            <input
              id="colorDescanso"
              ref={colorDescansoInputRef}
              type="color"
              value={colorDescanso}
              onChange={(e) => setColorDescanso(e.target.value)}
              className="color-picker"
            />
            <button
              type="button"
              className="badge badge-descanso badge-clickable"
              style={{
                backgroundColor: colorDescanso,
                color: darkenColor(colorDescanso, 0.4),
              }}
              onClick={() => colorDescansoInputRef.current?.click()}
            >
              Descanso
            </button>
          </div>
        </div>
      </section>

      <section className="calendar">
        <header className="calendar-header">
          <button onClick={handlePrevMonth}>{'←'}</button>
          {isMonthPickerOpen ? (
            <div className="month-picker-inline">
              <select
                value={currentMonth}
                onChange={handleMonthSelectChange}
                className="month-select"
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={handleYearSelectChange}
                className="year-select"
              >
                {Array.from({ length: 21 }).map((_, idx) => {
                  const year = today.getFullYear() - 10 + idx
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  )
                })}
              </select>
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(false)}
                className="month-picker-close"
                title="Listo"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13.5 4.5L6 12L2.5 8.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <h2
              onClick={handleMonthTitleClick}
              className="calendar-month-title"
              title="Haz clic para seleccionar mes y año"
            >
              {monthNames[currentMonth]} {currentYear}
            </h2>
          )}
          <button onClick={handleNextMonth}>{'→'}</button>
        </header>

        <div className="calendar-grid">
          {weekdayNames.map((name) => (
            <div key={name} className="calendar-weekday">
              {name}
            </div>
          ))}

          {monthMatrix.map((week, i) =>
            week.map((date, j) => {
              const shift = getShiftInfo(date)
              const isToday =
                date &&
                date.toDateString() === new Date().toDateString()

              let shiftClass = ''
              let shiftLabel = ''

              if (shift) {
                if (shift.type === 'DÍA') {
                  shiftClass = 'day-dia'
                  shiftLabel = 'Día'
                } else if (shift.type === 'NOCHE') {
                  shiftClass = 'day-noche'
                  shiftLabel = 'Noche'
                } else {
                  shiftClass = 'day-descanso'
                  shiftLabel = 'Descanso'
                }
              }

              // Estilos dinámicos según el tipo de turno
              let dayStyle: React.CSSProperties = {}
              let labelStyle: React.CSSProperties = {}

              if (shift) {
                if (shift.type === 'DÍA') {
                  dayStyle = {
                    background: `radial-gradient(circle at top left, ${lightenColor(colorDia, 0.15)}, ${colorDia})`,
                    boxShadow: `inset 0 0 0 1px ${darkenColor(colorDia, 0.2)}`,
                  }
                  labelStyle = {
                    backgroundColor: colorDia,
                    color: darkenColor(colorDia, 0.4),
                  }
                } else if (shift.type === 'NOCHE') {
                  dayStyle = {
                    background: `radial-gradient(circle at top left, ${lightenColor(colorNoche, 0.15)}, ${colorNoche})`,
                    boxShadow: `inset 0 0 0 1px ${darkenColor(colorNoche, 0.2)}`,
                  }
                  labelStyle = {
                    backgroundColor: colorNoche,
                    color: darkenColor(colorNoche, 0.4),
                  }
                } else {
                  dayStyle = {
                    background: `radial-gradient(circle at top left, ${lightenColor(colorDescanso, 0.15)}, ${colorDescanso})`,
                    boxShadow: `inset 0 0 0 1px ${darkenColor(colorDescanso, 0.2)}`,
                  }
                  labelStyle = {
                    backgroundColor: colorDescanso,
                    color: darkenColor(colorDescanso, 0.4),
                  }
                }
              }

              return (
                <div
                  key={`${i}-${j}`}
                  className={[
                    'calendar-day',
                    date ? '' : 'calendar-day-empty',
                    shiftClass,
                    isToday ? 'calendar-day-today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={dayStyle}
                >
                  {isToday && <div className="day-today-overlay">★</div>}
                  {date && (
                    <>
                      <div className="day-number">
                        {date.getDate()}
                      </div>
                      {shift && (
                        <div className="day-shift-label" style={labelStyle}>
                          {shiftLabel}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            }),
          )}
        </div>
      </section>

      <section className="notes">
        <p>
          El patrón es: 4 días de trabajo, 2 días de descanso, alternando
          bloques de día y de noche de manera automática.
        </p>
        <p>
          Cambia la fecha de inicio o el turno inicial para ajustar el
          calendario a la persona que estás controlando.
        </p>
      </section>
    </div>
  )
}

export default App
