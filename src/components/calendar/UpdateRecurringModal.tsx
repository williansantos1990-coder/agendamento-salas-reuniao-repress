import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface UpdateRecurringModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (updateSeries: boolean) => void
  meetingTitle: string
}

export function UpdateRecurringModal({
  isOpen,
  onClose,
  onConfirm,
  meetingTitle,
}: UpdateRecurringModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Reunião Recorrente</DialogTitle>
          <DialogDescription>
            A reunião "{meetingTitle}" faz parte de uma série recorrente. Você deseja salvar as
            alterações apenas para esta ocorrência ou para toda a série?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={() => onConfirm(false)}>
            Apenas esta ocorrência
          </Button>
          <Button onClick={() => onConfirm(true)}>Toda a série</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
