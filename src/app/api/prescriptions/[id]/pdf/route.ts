import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsPDF } from 'jspdf';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Query prescription details
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true, healthUnit: true } },
        municipality: true,
        items: { include: { medicine: true } },
      },
    });

    if (!prescription) {
      return new NextResponse('Receita não encontrada.', { status: 404 });
    }

    // Initialize A4 PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;

    // 1. Draw elegant border/frame
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.rect(margin - 5, margin - 5, pageWidth - 2 * margin + 10, pageHeight - 2 * margin + 10);

    // 2. Header Title
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(prescription.municipality.name.toUpperCase(), pageWidth / 2, margin + 10, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Unidade: ${prescription.doctor.healthUnit.name}`, pageWidth / 2, margin + 16, { align: 'center' });

    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.8);
    doc.line(margin, margin + 22, pageWidth - margin, margin + 22);

    // 3. Title of Document
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RECEITUÁRIO MÉDICO', pageWidth / 2, margin + 34, { align: 'center' });

    // 4. Patient Information Card
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(margin, margin + 42, pageWidth - 2 * margin, 24, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(margin, margin + 42, pageWidth - 2 * margin, 24, 'S');

    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PACIENTE:', margin + 5, margin + 48);
    doc.setFont('Helvetica', 'normal');
    doc.text(prescription.patient.name, margin + 28, margin + 48);

    doc.setFont('Helvetica', 'bold');
    doc.text('CPF:', margin + 5, margin + 54);
    doc.setFont('Helvetica', 'normal');
    doc.text(prescription.patient.cpf, margin + 18, margin + 54);

    doc.setFont('Helvetica', 'bold');
    doc.text('NASCIMENTO:', margin + 100, margin + 54);
    doc.setFont('Helvetica', 'normal');
    doc.text(new Date(prescription.patient.birthDate).toLocaleDateString('pt-BR'), margin + 130, margin + 54);

    doc.setFont('Helvetica', 'bold');
    doc.text('CNS:', margin + 5, margin + 60);
    doc.setFont('Helvetica', 'normal');
    doc.text(prescription.patient.cns || 'Não informado', margin + 18, margin + 60);

    // 5. Prescriptions list
    let currentY = margin + 78;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('USO INTERNO / PRESCRIÇÃO:', margin, currentY);

    doc.setFontSize(10);
    prescription.items.forEach((item, index) => {
      currentY += 8;
      
      // Draw item title
      doc.setFont('Helvetica', 'bold');
      doc.text(`${index + 1}. ${item.medicine.name} (${item.medicine.activeIngredient})`, margin + 2, currentY);
      
      // Quantity align right
      doc.text(`Qtd: ${item.quantity} ${item.medicine.unit.toLowerCase()}(s)`, pageWidth - margin - 5, currentY, { align: 'right' });

      currentY += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105); // slate-600
      
      const details = `Posologia: ${item.dosage} | Freq: ${item.frequency} | Duração: ${item.durationDays} dias`;
      doc.text(details, margin + 6, currentY);

      if (item.instructions) {
        currentY += 5;
        doc.text(`Instruções: ${item.instructions}`, margin + 6, currentY);
      }

      // Separator line between items
      currentY += 4;
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.setLineWidth(0.3);
      doc.line(margin + 2, currentY, pageWidth - margin - 2, currentY);
      doc.setTextColor(15, 23, 42); // reset color
    });

    // 6. Signatures and stamps area at bottom
    const signatureY = pageHeight - margin - 40;

    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 40, signatureY, pageWidth / 2 + 40, signatureY);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(prescription.doctor.user.name, pageWidth / 2, signatureY + 5, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(prescription.doctor.crm, pageWidth / 2, signatureY + 10, { align: 'center' });
    doc.text(new Date(prescription.createdAt).toLocaleDateString('pt-BR'), pageWidth / 2, signatureY + 15, { align: 'center' });

    // Digital signature verification block
    if (prescription.digitalSignature) {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Documento assinado digitalmente sob hash: ${prescription.digitalSignature}`, pageWidth / 2, signatureY + 24, { align: 'center' });
      doc.text('A validade deste receituário pode ser verificada no portal de saúde municipal.', pageWidth / 2, signatureY + 27, { align: 'center' });
    }

    const pdfBuffer = doc.output('arraybuffer');

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receita-${id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return new NextResponse(`Erro ao gerar PDF: ${error.message}`, { status: 500 });
  }
}
