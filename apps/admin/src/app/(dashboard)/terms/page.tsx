"use client";

import { Heading, Tabs, TabsContent, TabsList, TabsTrigger } from "@agency/ui";
import { LegalContentForm, LegalSeoForm } from "@/components/legal/legal-page-form";

export default function TermsPage() {
  return (
    <div>
      <Heading level={2}>Terms & Conditions</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">Content and SEO for the public /terms page.</p>

      <Tabs defaultValue="content" className="mt-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>
        <TabsContent value="content">
          <LegalContentForm pageKey="terms" defaultTitle="Terms & Conditions" />
        </TabsContent>
        <TabsContent value="seo">
          <LegalSeoForm pageKey="terms" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
