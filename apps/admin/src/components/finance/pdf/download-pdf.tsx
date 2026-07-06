import { pdf } from "@react-pdf/renderer";
import { FinanceDocumentPdf, type PdfDocumentData } from "./finance-document-pdf";
import { getPdfContext } from "./pdf-context";

export async function downloadFinancePdf(data: PdfDocumentData) {
  const branding = await getPdfContext();
  const blob = await pdf(<FinanceDocumentPdf data={data} branding={branding} />).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.number}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
