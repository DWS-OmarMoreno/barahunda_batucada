import Modal from './Modal';
import Button from './Button';

/**
 * Diálogo de confirmación para acciones destructivas o irreversibles
 * (inactivar, condonar, restablecer valores, etc.)
 */
export default function ConfirmDialog({
  abierto,
  titulo = 'Confirmar acción',
  mensaje,
  onConfirmar,
  onCancelar,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variant = 'danger',
  cargando = false,
}) {
  return (
    <Modal
      abierto={abierto}
      titulo={titulo}
      onClose={onCancelar}
      ancho="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancelar} disabled={cargando}>{textoCancelar}</Button>
          <Button variant={variant} onClick={onConfirmar} loading={cargando}>{textoConfirmar}</Button>
        </>
      }
    >
      <div className="confirm-dialog__mensaje">{mensaje}</div>
    </Modal>
  );
}
