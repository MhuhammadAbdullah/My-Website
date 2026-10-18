import { getSettings } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { InquiryForm } from "./inquiry-form";
import { arr, str, type Content } from "./types";

const options = (v: unknown) => arr<{ label?: string }>(v).map((o) => str(o.label)).filter(Boolean);

export async function InquirySection({ content }: { content: Content }) {
  const settings = await withFallback(getSettings(), {}, "settings");
  return (
    <InquiryForm
      heading={str(content.heading)}
      body={str(content.body)}
      email={str(content.email)}
      showPhone={content.showPhone !== false}
      showCompany={content.showCompany !== false}
      showService={content.showService !== false}
      showBudget={content.showBudget !== false}
      serviceOptions={options(content.serviceOptions)}
      budgetOptions={options(content.budgetOptions)}
      submitLabel={str(content.submitLabel) || "Send enquiry"}
      successMessage={str(content.successMessage) || "Thank you — we received your message."}
      errorMessage={str(content.errorMessage) || "Something went wrong. Please try again."}
      // Only the PUBLIC site key is ever sent to the browser; the secret stays on the API.
      turnstileSiteKey={settings.integrations?.turnstileSiteKey ?? ""}
    />
  );
}
