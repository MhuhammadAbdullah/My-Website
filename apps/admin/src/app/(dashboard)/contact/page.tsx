"use client";

import { Heading, Tabs, TabsContent, TabsList, TabsTrigger } from "@agency/ui";
import { PageHeroContentForm } from "@/components/page-hero-content-form";
import { ContactPageSettingsForm } from "@/components/contact-page-settings-form";

export default function ContactPage() {
  return (
    <Tabs defaultValue="content">
      <TabsList>
        <TabsTrigger value="content">Page Content</TabsTrigger>
        <TabsTrigger value="sections">Page Sections</TabsTrigger>
      </TabsList>
      <TabsContent value="content">
      <Heading level={2} className="admin-page-title">Contact Page</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">
        The hero heading, paragraph, and button labels at the top of the public Contact page. Contact details
        (email, WhatsApp number, address, hours, Calendly link) are managed from Site → Settings; form
        submissions are in Site → Messages.
      </p>
      <div className="mt-6">
        <PageHeroContentForm
          endpoint="/pages/contact"
          emptyValues={{ heroHeading: "", heroDescription: "", whatsappLabel: "", calendlyLabel: "" }}
          fields={[
            { key: "heroHeading", label: "Hero heading", isHeading: true, placeholder: "Let's build something **worth talking about**." },
            { key: "heroDescription", label: "Hero paragraph", type: "textarea" },
            { key: "whatsappLabel", label: "WhatsApp button label", placeholder: "Chat on WhatsApp" },
            { key: "calendlyLabel", label: "Calendly button label", placeholder: "Book an intro call" },
          ]}
          successMessage="Contact page content updated"
        />
      </div>
      </TabsContent>
      <TabsContent value="sections">
        <Heading level={2}>Contact Page Sections</Heading>
        <div className="mt-6">
          <ContactPageSettingsForm />
        </div>
      </TabsContent>
    </Tabs>
  );
}
