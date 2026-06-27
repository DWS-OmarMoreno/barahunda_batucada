import Button from './Button';

/**
 * Botón que construye y abre una URL de WhatsApp (https://wa.me/57{numero}?text=...)
 * con un mensaje dinámico ya armado por el módulo que lo use.
 */
export function construirUrlWhatsApp(numero, mensaje) {
  const soloDigitos = String(numero || '').replace(/\D/g, '');
  // Si el número ya viene con el indicativo de Colombia (57) no se duplica.
  const numeroConIndicativo = soloDigitos.startsWith('57') ? soloDigitos : `57${soloDigitos}`;
  const texto = encodeURIComponent(mensaje || '');
  return `https://wa.me/${numeroConIndicativo}?text=${texto}`;
}

export default function WhatsAppButton({ numero, mensaje, children = 'WhatsApp', variant = 'secondary', ...props }) {
  const url = construirUrlWhatsApp(numero, mensaje);

  return (
    <Button
      type="button"
      variant={variant}
      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
      {...props}
    >
      {children}
    </Button>
  );
}
