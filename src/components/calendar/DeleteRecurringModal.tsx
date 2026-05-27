import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (deleteSeries: boolean) => void
  meetingTitle: string
}

export function DeleteRecurringModal({ isOpen, onClose, onConfirm, meetingTitle }: Props) {
  const [deleteType, setDeleteType] = useState<'single' | 'series'>('single')

  useEffect(() => {
    if (isOpen) {
      setDeleteType('single')
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 py-4">
          <AlertTriangle className="h-10 w-10 text-yellow-500 shrink-0 mt-1" />
          <div className="flex flex-col space-y-4">
            <p className="text-sm text-foreground">
              Deseja excluir todas as ocorrências do compromisso recorrente "{meetingTitle}" ou
              somente esta?
            </p>

            <RadioGroup
              value={deleteType}
              onValueChange={(val) => setDeleteType(val as 'single' | 'series')}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="font-normal cursor-pointer">
                  Excluir esta ocorrência.
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="series" id="series" />
                <Label htmlFor="series" className="font-normal cursor-pointer">
                  Excluir a série.
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="sm:justify-end gap-2 sm:gap-0">
          <Button
            onClick={() => onConfirm(deleteType === 'series')}
            className="w-full sm:w-auto px-6"
          >
            OK
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto mt-2 sm:mt-0">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
