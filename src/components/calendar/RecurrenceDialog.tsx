import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { RecurrenceConfig, defaultRecurrenceConfig, formatDuration } from '@/lib/recurrence'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (config: RecurrenceConfig | null) => void
  initialConfig?: RecurrenceConfig | null
  baseDate: string
  baseStart: string
  baseEnd: string
}

export function RecurrenceDialog({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  baseDate,
  baseStart,
  baseEnd,
}: Props) {
  const [config, setConfig] = useState<RecurrenceConfig>(defaultRecurrenceConfig)

  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setConfig(initialConfig)
      } else {
        setConfig((prev) => ({
          ...prev,
          range: { ...prev.range, startDate: baseDate, endDate: baseDate },
          startTime: baseStart,
          endTime: baseEnd,
          weekly: { ...prev.weekly, days: [new Date(baseDate + 'T00:00:00').getDay()] },
        }))
      }
    }
  }, [isOpen, initialConfig, baseDate, baseStart, baseEnd])

  const updateConfig = (update: Partial<RecurrenceConfig>) =>
    setConfig((p) => ({ ...p, ...update }))
  const updateRange = (update: Partial<RecurrenceConfig['range']>) =>
    setConfig((p) => ({ ...p, range: { ...p.range, ...update } }))
  const updateDaily = (update: Partial<RecurrenceConfig['daily']>) =>
    setConfig((p) => ({ ...p, daily: { ...p.daily, ...update } }))
  const updateWeekly = (update: Partial<RecurrenceConfig['weekly']>) =>
    setConfig((p) => ({ ...p, weekly: { ...p.weekly, ...update } }))

  const handleDayToggle = (day: number) => {
    const newDays = config.weekly.days.includes(day)
      ? config.weekly.days.filter((d) => d !== day)
      : [...config.weekly.days, day]
    updateWeekly({ days: newDays })
  }

  const durationStr = formatDuration(config.startTime, config.endTime)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compromisso recorrente</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <fieldset className="border rounded-md p-4 space-y-4">
            <legend className="px-2 text-sm font-medium">Hora do compromisso</legend>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="flex items-center space-x-2">
                <Label>Início:</Label>
                <Input
                  type="time"
                  value={config.startTime}
                  onChange={(e) => updateConfig({ startTime: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label>Fim:</Label>
                <Input
                  type="time"
                  value={config.endTime}
                  onChange={(e) => updateConfig({ endTime: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label>Duração:</Label>
                <Input value={durationStr} disabled className="bg-muted" />
              </div>
            </div>
          </fieldset>

          <fieldset className="border rounded-md p-4 flex gap-4">
            <legend className="px-2 text-sm font-medium">Padrão de recorrência</legend>
            <RadioGroup
              value={config.pattern}
              onValueChange={(v: any) => updateConfig({ pattern: v })}
              className="flex flex-col space-y-2 w-1/4 border-r pr-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="p-daily" />
                <Label htmlFor="p-daily">Diário</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="p-weekly" />
                <Label htmlFor="p-weekly">Semanal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="p-monthly" />
                <Label htmlFor="p-monthly">Mensal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yearly" id="p-yearly" />
                <Label htmlFor="p-yearly">Anual</Label>
              </div>
            </RadioGroup>

            <div className="flex-1 pl-4">
              {config.pattern === 'daily' && (
                <RadioGroup
                  value={config.daily.type}
                  onValueChange={(v: any) => updateDaily({ type: v })}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="every_days" id="d-every" />
                    <Label htmlFor="d-every" className="flex items-center space-x-2">
                      <span>A cada</span>
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        value={config.daily.days}
                        onChange={(e) => updateDaily({ days: Number(e.target.value) })}
                        disabled={config.daily.type !== 'every_days'}
                      />
                      <span>dia(s)</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="every_weekday" id="d-weekday" />
                    <Label htmlFor="d-weekday">Todos os dias úteis</Label>
                  </div>
                </RadioGroup>
              )}

              {config.pattern === 'weekly' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Label>A cada</Label>
                    <Input
                      type="number"
                      min={1}
                      className="w-20"
                      value={config.weekly.interval}
                      onChange={(e) => updateWeekly({ interval: Number(e.target.value) })}
                    />
                    <Label>semana(s) no(a):</Label>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[
                      'domingo',
                      'segunda-feira',
                      'terça-feira',
                      'quarta-feira',
                      'quinta-feira',
                      'sexta-feira',
                      'sábado',
                    ].map((day, i) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`w-${i}`}
                          checked={config.weekly.days.includes(i)}
                          onCheckedChange={() => handleDayToggle(i)}
                        />
                        <Label htmlFor={`w-${i}`}>{day}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {config.pattern === 'monthly' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Ocorrências mensais (Padrão simples utilizado)
                  </p>
                </div>
              )}
              {config.pattern === 'yearly' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Ocorrências anuais (Padrão simples utilizado)
                  </p>
                </div>
              )}
            </div>
          </fieldset>

          <fieldset className="border rounded-md p-4 space-y-4">
            <legend className="px-2 text-sm font-medium">Intervalo de recorrência</legend>
            <div className="flex items-center space-x-4 mb-4">
              <Label>Começa em:</Label>
              <Input
                type="date"
                value={config.range.startDate}
                onChange={(e) => updateRange({ startDate: e.target.value })}
                className="w-40"
              />
            </div>

            <RadioGroup
              value={config.range.endType}
              onValueChange={(v: any) => updateRange({ endType: v })}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="end_date" id="r-end" />
                <Label htmlFor="r-end" className="flex items-center space-x-2">
                  <span className="w-28 cursor-pointer">Termina em:</span>
                  <Input
                    type="date"
                    value={config.range.endDate}
                    onChange={(e) => updateRange({ endDate: e.target.value })}
                    disabled={config.range.endType !== 'end_date'}
                    className="w-40"
                  />
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="occurrences" id="r-occ" />
                <Label htmlFor="r-occ" className="flex items-center space-x-2">
                  <span className="w-28 cursor-pointer">Termina após:</span>
                  <Input
                    type="number"
                    min={1}
                    value={config.range.occurrences}
                    onChange={(e) => updateRange({ occurrences: Number(e.target.value) })}
                    disabled={config.range.endType !== 'occurrences'}
                    className="w-20"
                  />
                  <span>ocorrências</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no_end" id="r-no" />
                <Label htmlFor="r-no" className="cursor-pointer">
                  Sem data de término
                </Label>
              </div>
            </RadioGroup>
          </fieldset>
        </div>

        <DialogFooter className="flex justify-between items-center w-full">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onSave(null)
              onClose()
            }}
          >
            Remover recorrência
          </Button>
          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => onSave(config)}>
              OK
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
