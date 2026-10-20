import 'server-only';
import { jsPDF } from 'jspdf';
import type { Gym, Profile, Receipt } from './types';
import { formatDate } from './format';

const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

/** Genera el PDF del recibo en el servidor a partir de datos ya validados en base de datos. */
export function buildReceiptPdf(gym: Gym, client: Pick<Profile, 'full_name' | 'dni' | 'email'>, r: Receipt): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const voided = Boolean(r.voided_at);

  // Cabecera
  doc.setFillColor(27, 26, 23);
  doc.rect(0, 0, W, 42, 'F');
  doc.setTextColor(224, 169, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(doc.splitTextToSize(gym.name, 100), 14, 24);
  doc.setFontSize(18);
  doc.text('RECIBO DE PAGO', W - 14, 22, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(237, 232, 220);
  doc.setFont('helvetica', 'normal');
  doc.text(r.receipt_code ?? '—', W - 14, 29, { align: 'right' });

  // Emisor / receptor
  doc.setTextColor(27, 26, 23);
  doc.setFontSize(10);
  let y = 56;
  doc.setFont('helvetica', 'bold');
  doc.text('EMISOR', 14, y);
  doc.text('CLIENTE', 110, y);
  doc.setFont('helvetica', 'normal');
  const issuer = [gym.legal_name || gym.name, gym.tax_id ? `NIF/CIF: ${gym.tax_id}` : '', gym.address ?? '', gym.phone ?? '', gym.contact_email ?? ''].filter(Boolean);
  const recv = [client.full_name, client.dni ? `DNI: ${client.dni}` : '', client.email ?? ''].filter(Boolean);
  issuer.forEach((l, i) => doc.text(doc.splitTextToSize(l, 85), 14, y + 6 + i * 5.5));
  recv.forEach((l, i) => doc.text(doc.splitTextToSize(l, 85), 110, y + 6 + i * 5.5));

  // Datos del recibo
  y = 98;
  doc.setDrawColor(200, 195, 185);
  doc.line(14, y - 6, W - 14, y - 6);
  const meta: [string, string][] = [
    ['Fecha de pago', formatDate(r.payment_date)],
    ['Método de pago', r.payment_method ?? 'Efectivo'],
    ['Periodo', r.period_start && r.period_end ? `${formatDate(r.period_start)} – ${formatDate(r.period_end)}` : '—'],
  ];
  meta.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold'); doc.text(k, 14, y + i * 6);
    doc.setFont('helvetica', 'normal'); doc.text(v, 58, y + i * 6);
  });

  // Tabla
  y = 130;
  doc.setFillColor(240, 236, 226);
  doc.rect(14, y - 5, W - 28, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTO', 17, y);
  doc.text('IMPORTE', W - 17, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(r.concept, 120), 17, y + 10);

  const base = r.base_amount ?? r.amount;
  const vatRate = r.vat_rate ?? 0;
  const vat = r.vat_amount ?? 0;
  let ty = y + 26;
  const line = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, 120, ty);
    doc.text(value, W - 17, ty, { align: 'right' });
    ty += 7;
  };
  doc.setDrawColor(200, 195, 185);
  doc.line(14, y + 20, W - 14, y + 20);
  line('Base imponible', eur(base));
  line(vatRate === 0 ? 'IVA (0 % · exento)' : `IVA (${vatRate.toString().replace('.', ',')} %)`, eur(vat));
  doc.line(120, ty - 4, W - 14, ty - 4);
  doc.setFontSize(12);
  line('TOTAL', eur(r.amount), true);

  doc.setFontSize(8.5);
  doc.setTextColor(110, 105, 95);
  doc.text(vatRate === 0 ? 'Operación sin IVA.' : `El total incluye ${vatRate.toString().replace('.', ',')} % de IVA (${eur(vat)}).`, W - 14, ty + 2, { align: 'right' });
  doc.text('Gracias por entrenar con nosotros. Conserva este comprobante.', 14, 270);
  doc.text(`Emitido el ${formatDate(r.created_at)}`, 14, 275);
  doc.text('Generado con OpenGym', W - 14, 275, { align: 'right' });

  if (voided) {
    doc.setTextColor(200, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(54);
    doc.text('ANULADO', W / 2, 190, { align: 'center', angle: 28 });
    doc.setFontSize(9);
    doc.text(`Anulado el ${formatDate(r.voided_at)}${r.void_reason ? `: ${r.void_reason}` : ''}`, 14, 280);
  }

  return Buffer.from(doc.output('arraybuffer'));
}
